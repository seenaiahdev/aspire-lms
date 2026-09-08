// Vercel serverless function: emails a login OTP to a registered student.
// The Gmail app password lives ONLY here (server-side) as an env var — never in the browser.
// Stateless: no DB. We return a signed token (HMAC of code+email+expiry); verify-otp checks it.
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const OTP_SECRET = process.env.OTP_SECRET || 'aspire_lms_otp_hmac_secret_key_2026';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

// ── Best-effort rate limiting ────────────────────────────────────────────────
// In-memory, per warm serverless instance. This meaningfully slows OTP spam /
// enumeration but is NOT a hard guarantee across many concurrent instances —
// for that, back it with a shared store (e.g. Upstash Redis / Vercel KV).
const COOLDOWN_MS = 30 * 1000;      // min gap between sends to the same phone
const HOURLY_CAP = 5;               // max sends per phone per rolling hour
const IP_HOURLY_CAP = 20;           // max sends per IP per rolling hour
const rlByPhone = new Map();        // suffix -> number[] (timestamps)
const rlByIp = new Map();           // ip -> number[] (timestamps)

function prune(list, windowMs, now) {
  return (list || []).filter((t) => now - t < windowMs);
}
// Returns { ok } or { ok:false, retryAfter } (seconds). Records the hit when allowed.
function checkRate(suffix, ip) {
  const now = Date.now();
  const phoneHits = prune(rlByPhone.get(suffix), 60 * 60 * 1000, now);
  const ipHits = prune(rlByIp.get(ip), 60 * 60 * 1000, now);
  const lastPhone = phoneHits[phoneHits.length - 1];
  if (lastPhone && now - lastPhone < COOLDOWN_MS) {
    return { ok: false, retryAfter: Math.ceil((COOLDOWN_MS - (now - lastPhone)) / 1000) };
  }
  if (phoneHits.length >= HOURLY_CAP || ipHits.length >= IP_HOURLY_CAP) {
    return { ok: false, retryAfter: 3600 };
  }
  phoneHits.push(now); ipHits.push(now);
  rlByPhone.set(suffix, phoneHits); rlByIp.set(ip, ipHits);
  return { ok: true };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.warn('send-otp: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.');
      return res.status(503).json({ error: 'email_not_configured', hint: 'Configure GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const suffix = cleanSuffix(body.phone);
    if (suffix.length < 10) return res.status(400).json({ error: 'invalid_phone' });

    const ip = String(
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress || 'unknown'
    );
    const rate = checkRate(suffix, ip);
    if (!rate.ok) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      return res.status(429).json({ error: 'too_many_requests', retryAfter: rate.retryAfter });
    }

    // Only registered students get an OTP — look up student via SECURITY DEFINER RPC first
    // (works even when direct SELECT on students table is revoked for anon)
    let student = null;
    try {
      const rpcResp = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_student_by_phone`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON,
            authorization: `Bearer ${SUPABASE_ANON}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ suffix }),
        }
      );
      if (rpcResp.ok) {
        const data = await rpcResp.json();
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        student = rows.find((s) => cleanSuffix(s.mobile_number) === suffix) || rows[0] || null;
      }
    } catch (rpcErr) {
      console.warn('send-otp: RPC get_student_by_phone failed:', rpcErr);
    }

    if (!student) {
      // Fallback to direct SELECT if RPC is unavailable
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/students?select=name,email,mobile_number&mobile_number=ilike.*${suffix}&limit=5`,
          { headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        const rows = await r.json();
        student = Array.isArray(rows) ? rows.find((s) => cleanSuffix(s.mobile_number) === suffix) : null;
      } catch (directErr) {
        console.warn('send-otp: direct select failed:', directErr);
      }
    }

    if (!student || !student.email) return res.status(404).json({ error: 'not_registered' });

    const email = String(student.email).trim();
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiry = Date.now() + TTL_MS;
    const sig = crypto.createHmac('sha256', OTP_SECRET).update(`${code}|${email}|${expiry}`).digest('hex');
    const token = Buffer.from(`${email}|${expiry}`).toString('base64') + '.' + sig;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const displayName = (student.name && student.name.trim()) ? student.name.trim() : 'Student';
    const year = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AspireNext Authentication Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;margin:0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          
          <!-- Corporate Header -->
          <tr>
            <td style="background-color:#0f172a;padding:24px 36px;border-bottom:3px solid #2563eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.4px;">Aspire<span style="color:#60a5fa;">Next</span></span>
                  </td>
                  <td align="right">
                    <span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Identity Services</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 20px;">
              <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f172a;">Dear ${displayName},</p>
              
              <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#334155;">
                We received a request to authenticate your session for the AspireNext Student Portal. Please use the One-Time Passcode (OTP) below to complete your sign-in:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:22px 32px;display:inline-block;min-width:240px;text-align:center;">
                      <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Verification Passcode</div>
                      <div style="font-family:Consolas,'SF Mono',Menlo,Monaco,'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#0f172a;padding-left:10px;">${code}</div>
                      <div style="font-size:12px;color:#64748b;margin-top:8px;">Valid for 5 minutes</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Formal Security Notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:3px solid #64748b;border-radius:0 4px 4px 0;margin:24px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:12.5px;line-height:19px;color:#475569;">
                      <strong>Security Advisory:</strong> Do not disclose this code to anyone. AspireNext administrative and technical personnel will never request your passcode. If you did not initiate this authentication request, please disregard this communication or contact your platform administrator immediately.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 4px;font-size:14px;color:#334155;">Sincerely,</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">AspireNext Security & Identity Services</p>
            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:22px 36px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px;font-size:11.5px;line-height:17px;color:#94a3b8;">
                This is an automated system notification from AspireNext Learning Systems. Please do not reply directly to this transmission.
              </p>
              <p style="margin:0;font-size:11.5px;line-height:17px;color:#94a3b8;">
                &copy; ${year} AspireNext Technologies. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `AspireNext Authentication Notification

Dear ${displayName},

We received a request to authenticate your session for the AspireNext Student Portal. Please use the following One-Time Passcode (OTP) to complete your sign-in:

VERIFICATION PASSCODE: ${code}
(This code is valid for 5 minutes)

Security Advisory:
- Do not disclose this code to anyone. AspireNext personnel will never request your passcode.
- If you did not initiate this request, someone may be attempting to access your account. Please disregard this email or notify your platform administrator immediately.

Sincerely,
AspireNext Security & Identity Services

---
This is an automated system notification. Please do not reply directly to this email.
© ${year} AspireNext Technologies. All rights reserved.`;

    await transporter.sendMail({
      from: `AspireNext Security <${GMAIL_USER}>`,
      to: email,
      subject: `AspireNext Authentication Code: ${code}`,
      text,
      html,
    });

    const emailHint = email.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}****${b}`);
    return res.status(200).json({ token, emailHint });
  } catch (e) {
    console.error('send-otp error:', e);
    const isAuth = e?.code === 'EAUTH' || (e?.response && e?.response.includes('535'));
    return res.status(500).json({
      error: isAuth ? 'smtp_auth_failed' : 'send_failed',
      message: isAuth
        ? 'Gmail SMTP rejected credentials (535 BadCredentials). Check GMAIL_USER and generate a new 16-character App Password.'
        : (e?.message || 'Failed to deliver verification code')
    });
  }
};

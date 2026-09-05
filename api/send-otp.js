// Vercel serverless function: emails a login OTP to a registered student.
// The Gmail app password lives ONLY here (server-side) as an env var — never in the browser.
// Stateless: no DB. We return a signed token (HMAC of code+email+expiry); verify-otp checks it.
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
// Fail closed: no insecure default. If OTP_SECRET is unset the endpoint refuses to issue
// tokens (a known default like 'change-me' would let anyone forge a valid OTP token).
const OTP_SECRET = process.env.OTP_SECRET;
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
    if (!OTP_SECRET) {
      console.error('send-otp: OTP_SECRET is not configured — refusing to issue tokens.');
      return res.status(500).json({ error: 'server_misconfigured' });
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

    // Only registered students get an OTP — look up their email in Supabase (server-side),
    // filtered by phone suffix so we never pull the whole students table into the function.
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/students?select=name,email,mobile_number&mobile_number=ilike.*${suffix}&limit=5`,
      { headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    const rows = await r.json();
    const student = Array.isArray(rows) ? rows.find((s) => cleanSuffix(s.mobile_number) === suffix) : null;
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

    const displayName = (student.name || 'there').toString();
    const year = new Date().getFullYear();

    const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5fb;margin:0;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececf3;">
        <tr>
          <td style="background:#5b21b6;background:linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%);padding:26px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Aspire<span style="color:#c4b5fd;">Next</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 4px;">
            <p style="margin:0 0 6px;font-size:15px;color:#111827;font-weight:600;">Hi ${displayName},</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#4b5563;">Use the verification code below to sign in to your AspireNext account. This code is valid for <strong>5 minutes</strong>.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:4px 0 24px;">
                  <div style="display:inline-block;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:18px 34px;">
                    <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#5b21b6;">${code}</span>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 26px;font-size:13px;line-height:20px;color:#6b7280;">If you didn't request this code, you can safely ignore this email — no changes will be made to your account.</p>
          </td>
        </tr>
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #eef0f5;"></div></td></tr>
        <tr>
          <td style="padding:18px 32px 30px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#9ca3af;">For your security, never share this code with anyone. AspireNext staff will never ask you for it.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fafafe;padding:18px 32px;border-top:1px solid #eef0f5;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} AspireNext · Learn. Practice. Achieve.</p>
            <p style="margin:6px 0 0;font-size:11px;color:#b6bcc9;">This is an automated message — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

    const text = `AspireNext — Sign in

Hi ${displayName},

Your verification code is: ${code}
This code is valid for 5 minutes.

If you didn't request this, you can ignore this email.
For your security, never share this code with anyone.

© ${year} AspireNext`;

    await transporter.sendMail({
      from: `AspireNext <${GMAIL_USER}>`,
      to: email,
      subject: `${code} is your AspireNext verification code`,
      text,
      html,
    });

    const emailHint = email.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}****${b}`);
    return res.status(200).json({ token, emailHint });
  } catch (e) {
    console.error('send-otp error:', e);
    return res.status(500).json({ error: 'send_failed' });
  }
};

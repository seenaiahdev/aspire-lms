// Production Express handler: send-otp
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cache = require('../lib/cache');
const { getCandidateSecrets, isWeakSecret } = require('../lib/passkey-crypto');
const { cleanPhoneSuffix } = require('../lib/utils');
const { getSupabaseClient } = require('../lib/supabase');

const COOLDOWN_MS = 30 * 1000;
const HOURLY_CAP = 5;
const IP_HOURLY_CAP = 20;
const rlByPhone = new Map();
const rlByIp = new Map();

function prune(list, windowMs, now) {
  return (list || []).filter((t) => now - t < windowMs);
}

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

  const supabase = getSupabaseClient();
  const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
  const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  let OTP_SECRET;
  try {
    const secrets = getCandidateSecrets();
    OTP_SECRET = secrets[0];
  } catch (secErr) {
    return res.status(500).json({ error: 'server_misconfiguration', message: secErr.message });
  }

  if (process.env.NODE_ENV === 'production' && isWeakSecret(process.env.OTP_SECRET)) {
    return res.status(500).json({
      error: 'server_misconfiguration',
      message: 'Fail-closed: Production requires high-entropy OTP_SECRET.'
    });
  }
  const TTL_MS = 5 * 60 * 1000;

  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.warn('send-otp: GMAIL credentials not set');
      return res.status(503).json({ error: 'email_not_configured', hint: 'Configure GMAIL_USER and GMAIL_APP_PASSWORD in environment variables' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const suffix = cleanPhoneSuffix(body.phone);
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

    let student = cache.get(`student_phone:${suffix}`);
    if (!student) {
      try {
        const rpcResp = await supabase.authFetch('/rpc/get_student_by_phone', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ suffix }),
        });
        if (rpcResp.ok) {
          const data = await rpcResp.json();
          const rows = Array.isArray(data) ? data : data ? [data] : [];
          student = rows.find((s) => cleanPhoneSuffix(s.mobile_number) === suffix) || rows[0] || null;
        }
      } catch (rpcErr) {
        console.warn('send-otp: RPC lookup error:', rpcErr.message);
      }

      if (!student) {
        try {
          const r = await supabase.authFetch(
            `/students?select=name,email,mobile_number&mobile_number=ilike.*${suffix}&limit=5`
          );
          const rows = await r.json();
          student = Array.isArray(rows) ? rows.find((s) => cleanPhoneSuffix(s.mobile_number) === suffix) : null;
        } catch (directErr) {
          console.warn('send-otp: direct lookup error:', directErr.message);
        }
      }

      if (student) {
        cache.set(`student_phone:${suffix}`, student, 60_000);
        if (student.id) cache.set(`student_id:${student.id}`, student, 60_000);
      }
    }

    if (!student || !student.email) return res.status(404).json({ error: 'not_registered' });

    const email = String(student.email).trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + TTL_MS;
    const salt = crypto.randomBytes(16).toString('hex');
    const sig = crypto.createHmac('sha256', OTP_SECRET).update(`${code}|${email}|${expiry}|${salt}`).digest('hex');
    const token = Buffer.from(`${email}|${expiry}|${salt}`).toString('base64') + '.' + sig;
    cache.set(`otp_token:${sig}`, { code, email, expiry }, TTL_MS);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.6;">
  <p style="margin: 0 0 16px 0;">Hi,</p>
  <p style="margin: 0 0 16px 0;">${code} is your AspireNext verification OTP. Please do not share it with anyone.</p>
  <p style="margin: 0;">Team AspireNext</p>
</div>`;

    const text = `Hi,

${code} is your AspireNext verification OTP. Please do not share it with anyone.

Team AspireNext`;

    await transporter.sendMail({
      from: `AspireNext <${GMAIL_USER}>`,
      to: email,
      subject: `Login OTP from AspireNext`,
      text,
      html,
    });

    // Optional: Fast2SMS dispatch
    if (process.env.FAST2SMS_API_KEY) {
      try {
        await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY.trim(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: code,
            numbers: suffix
          }),
          signal: AbortSignal.timeout(4000),
        });
      } catch (smsErr) {
        console.warn('send-otp: Fast2SMS dispatch failed:', smsErr);
      }
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID.trim();
        const twilioAuth = process.env.TWILIO_AUTH_TOKEN.trim();
        const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const form = new URLSearchParams();
        form.append('To', `+91${suffix}`);
        form.append('From', process.env.TWILIO_PHONE_NUMBER.trim());
        form.append('Body', `Hi, ${code} is your AspireNext verification OTP. Please do not share it with anyone.`);
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString(),
          signal: AbortSignal.timeout(4000),
        });
      } catch (twilioErr) {
        console.warn('send-otp: Twilio dispatch failed:', twilioErr);
      }
    }

    const emailHint = email.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}****${b}`);
    return res.status(200).json({ ok: true, token, emailHint });
  } catch (err) {
    console.error('send-otp error:', err);
    const isAuth = err?.code === 'EAUTH' || (err?.response && err?.response.includes('535'));
    return res.status(500).json({
      error: isAuth ? 'smtp_auth_failed' : 'send_failed',
      message: isAuth
        ? 'Gmail SMTP rejected credentials (535 BadCredentials). Check GMAIL_USER and generate a new 16-character App Password.'
        : (err?.message || 'Failed to deliver verification code')
    });
  }
};

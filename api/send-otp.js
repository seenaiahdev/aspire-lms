// Vercel serverless function: emails a login OTP to a registered student.
// The Gmail app password lives ONLY here (server-side) as an env var — never in the browser.
// Stateless: no DB. We return a signed token (HMAC of code+email+expiry); verify-otp checks it.
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const OTP_SECRET = process.env.OTP_SECRET || 'change-me';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const suffix = cleanSuffix(body.phone);
    if (suffix.length < 10) return res.status(400).json({ error: 'invalid_phone' });

    // Only registered students get an OTP — look up their email in Supabase (server-side).
    const r = await fetch(`${SUPABASE_URL}/rest/v1/students?select=name,email,mobile_number`, {
      headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
    });
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
    await transporter.sendMail({
      from: `AspireNext <${GMAIL_USER}>`,
      to: email,
      subject: `${code} is your AspireNext login code`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:16px">
          <h2 style="color:#7c3aed;margin:0 0 8px">AspireNext Login</h2>
          <p style="color:#333;font-size:14px">Hi ${student.name || 'Student'}, use this one-time code to sign in:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#111;margin:18px 0;text-align:center">${code}</div>
          <p style="color:#888;font-size:12px">This code expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
        </div>`,
    });

    const emailHint = email.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}****${b}`);
    return res.status(200).json({ token, emailHint });
  } catch (e) {
    console.error('send-otp error:', e);
    return res.status(500).json({ error: 'send_failed' });
  }
};

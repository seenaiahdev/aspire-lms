// Vercel serverless function: verifies the OTP the student typed.
// Stateless — recomputes the HMAC of (code|email|expiry) and compares to the token from send-otp.
// The code itself only ever exists in the email; the token can't be forged without OTP_SECRET.
const crypto = require('crypto');

const OTP_SECRET = process.env.OTP_SECRET || 'change-me';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = String(body.token || '');
    const code = String(body.code || '');
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig || !code) return res.status(400).json({ ok: false });

    const [email, expiryStr] = Buffer.from(payloadB64, 'base64').toString('utf8').split('|');
    const expiry = Number(expiryStr);
    if (!email || !expiry) return res.status(200).json({ ok: false, reason: 'bad_token' });
    if (Date.now() > expiry) return res.status(200).json({ ok: false, reason: 'expired' });

    const expected = crypto.createHmac('sha256', OTP_SECRET).update(`${code}|${email}|${expiry}`).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
};

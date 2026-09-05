// Vercel serverless function: verifies the OTP the student typed.
// Stateless — recomputes the HMAC of (code|email|expiry) and compares to the token from send-otp.
// The code itself only ever exists in the email; the token can't be forged without OTP_SECRET.
const crypto = require('crypto');

// Fail closed: a known default secret would let anyone forge a valid token.
const OTP_SECRET = process.env.OTP_SECRET;

// Best-effort per-token attempt limiting (in-memory, per warm instance). A 6-digit
// code has 1M combinations; without a cap an attacker could brute-force it within the
// 5-min window by reusing the same stateless token. Keyed by the token signature so it
// survives across requests on the same instance. Use a shared store for hard guarantees.
const MAX_ATTEMPTS = 5;
const attemptsBySig = new Map(); // sig -> { count, expiry }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  try {
    if (!OTP_SECRET) {
      console.error('verify-otp: OTP_SECRET is not configured.');
      return res.status(500).json({ ok: false, error: 'server_misconfigured' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = String(body.token || '');
    const code = String(body.code || '');
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig || !code) return res.status(400).json({ ok: false });

    const [email, expiryStr] = Buffer.from(payloadB64, 'base64').toString('utf8').split('|');
    const expiry = Number(expiryStr);
    if (!email || !expiry) return res.status(200).json({ ok: false, reason: 'bad_token' });
    if (Date.now() > expiry) return res.status(200).json({ ok: false, reason: 'expired' });

    // Throttle guesses against this token.
    const now = Date.now();
    const rec = attemptsBySig.get(sig);
    if (rec && rec.expiry > now && rec.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ ok: false, reason: 'too_many_attempts' });
    }

    const expected = crypto.createHmac('sha256', OTP_SECRET).update(`${code}|${email}|${expiry}`).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!ok) {
      const count = (rec && rec.expiry > now ? rec.count : 0) + 1;
      attemptsBySig.set(sig, { count, expiry });
    } else {
      attemptsBySig.delete(sig);
    }
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
};

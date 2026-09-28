// Production Express handler: verify-otp
const crypto = require('crypto');

const MAX_ATTEMPTS = 5;
const attemptsBySig = new Map();

module.exports = async (req, res) => {
  const OTP_SECRET = process.env.OTP_SECRET || 'some-secure-random-secret-key-12345';

  try {
    const body = req.body || {};
    const token = String(body.token || '');
    const code = String(body.code || '');
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig || !code) return res.status(400).json({ ok: false });

    const [email, expiryStr] = Buffer.from(payloadB64, 'base64').toString('utf8').split('|');
    const expiry = Number(expiryStr);
    if (!email || !expiry) return res.status(200).json({ ok: false, reason: 'bad_token' });
    if (Date.now() > expiry) return res.status(200).json({ ok: false, reason: 'expired' });

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

// Production Express handler: verify-otp
const crypto = require('crypto');
const cache = require('../lib/cache');
const { getCandidateSecrets, isWeakSecret } = require('../lib/passkey-crypto');

const MAX_ATTEMPTS = 5;
const attemptsBySig = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (process.env.NODE_ENV === 'production' && isWeakSecret(process.env.OTP_SECRET)) {
    return res.status(500).json({ ok: false, error: 'Fail-closed: High-entropy OTP_SECRET required in production.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = String(body.token || '');
    const code = String(body.code || '');
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig || !code) return res.status(400).json({ ok: false });

    const parts = Buffer.from(payloadB64, 'base64').toString('utf8').split('|');
    const email = parts[0];
    const expiry = Number(parts[1]);
    const salt = parts[2] || '';

    if (!email || !expiry) return res.status(200).json({ ok: false, reason: 'bad_token' });
    if (Date.now() > expiry) return res.status(200).json({ ok: false, reason: 'expired' });

    const now = Date.now();
    const rec = attemptsBySig.get(sig);
    if (rec && rec.expiry > now && rec.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ ok: false, reason: 'too_many_attempts' });
    }

    let ok = false;

    // 1. Check server-side memory cache (prevents offline HMAC brute force)
    const cachedRecord = cache.get(`otp_token:${sig}`);
    if (cachedRecord && cachedRecord.code === code && cachedRecord.email === email) {
      ok = true;
    }

    // 2. Validate cryptographic HMAC with timing-safe comparison
    if (!ok) {
      const candidates = getCandidateSecrets();
      for (const secret of candidates) {
        const updateStr = salt ? `${code}|${email}|${expiry}|${salt}` : `${code}|${email}|${expiry}`;
        const expected = crypto.createHmac('sha256', secret).update(updateStr).digest('hex');
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          ok = true;
          break;
        }
      }
    }

    if (!ok) {
      const count = (rec && rec.expiry > now ? rec.count : 0) + 1;
      attemptsBySig.set(sig, { count, expiry });
    } else {
      attemptsBySig.delete(sig);
      cache.invalidate(`otp_token:${sig}`);
    }
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
};

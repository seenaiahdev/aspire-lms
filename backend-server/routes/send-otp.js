// Production Express handler: send-otp
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

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
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co';
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';
  const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
  const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const OTP_SECRET = process.env.OTP_SECRET || 'some-secure-random-secret-key-12345';
  const TTL_MS = 5 * 60 * 1000;

  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.warn('send-otp: GMAIL credentials not set');
      return res.status(503).json({ error: 'email_not_configured' });
    }

    const body = req.body || {};
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
      console.warn('send-otp: RPC lookup error:', rpcErr.message);
    }

    if (!student) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/students?select=name,email,mobile_number&mobile_number=ilike.*${suffix}&limit=5`,
          { headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        const rows = await r.json();
        student = Array.isArray(rows) ? rows.find((s) => cleanSuffix(s.mobile_number) === suffix) : null;
      } catch (directErr) {
        console.warn('send-otp: direct lookup error:', directErr.message);
      }
    }

    if (!student || !student.email) return res.status(404).json({ error: 'not_registered' });

    const email = String(student.email).trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + TTL_MS;
    const sig = crypto.createHmac('sha256', OTP_SECRET).update(`${code}|${email}|${expiry}`).digest('hex');
    const token = Buffer.from(`${email}|${expiry}`).toString('base64') + '.' + sig;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"AspireNext" <${GMAIL_USER}>`,
      to: email,
      subject: `${code} is your Aspire verification code`,
      text: `Hi,\n\n${code} is your Aspire verification OTP. Please do not share it.\n\nTeam AspireNext`,
    });

    const [u, d] = email.split('@');
    const masked = `${u.slice(0, 2)}***@${d}`;
    return res.status(200).json({ ok: true, token, emailHint: masked });
  } catch (err) {
    console.error('send-otp error:', err);
    return res.status(500).json({ error: 'failed_to_send_code' });
  }
};

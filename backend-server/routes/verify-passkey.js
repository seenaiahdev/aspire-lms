// Production Express handler: verify-passkey with single-use auto-rotation
const { decryptPasskey, encryptPasskey, generatePasskey } = require('../lib/passkey-crypto');

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attemptsByTarget = new Map();

function checkRateLimit(key) {
  const now = Date.now();
  const rec = attemptsByTarget.get(key);
  if (rec && rec.expiry > now && rec.count >= MAX_ATTEMPTS) {
    const remainingMinutes = Math.ceil((rec.expiry - now) / 60000);
    return {
      allowed: false,
      error: `Too many attempts. Wait ${remainingMinutes}m or contact admin.`,
    };
  }
  return { allowed: true };
}

function recordFailure(key) {
  const now = Date.now();
  const rec = attemptsByTarget.get(key);
  if (rec && rec.expiry > now) {
    attemptsByTarget.set(key, { count: rec.count + 1, expiry: rec.expiry });
  } else {
    attemptsByTarget.set(key, { count: 1, expiry: now + LOCKOUT_MS });
  }
}

function clearFailures(key) {
  attemptsByTarget.delete(key);
}

module.exports = async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co';
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';

  try {
    const body = req.body || {};
    const studentId = String(body.studentId || '').trim();
    const phone = String(body.phone || '').trim();
    const candidatePasskey = String(body.passkey || '').trim();

    const suffix = cleanSuffix(phone);
    const rateLimitKey = studentId || suffix || 'unknown';

    if (!candidatePasskey) {
      return res.status(400).json({ ok: false, error: 'Please enter your Passkey.' });
    }

    if (!studentId && suffix.length < 10) {
      return res.status(400).json({ ok: false, error: 'Student identification required.' });
    }

    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ ok: false, error: rateCheck.error });
    }

    let url = '';
    if (studentId) {
      url = `${SUPABASE_URL}/rest/v1/students?select=id,name,mobile_number,access_pin&id=eq.${encodeURIComponent(studentId)}&limit=1`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/students?select=id,name,mobile_number,access_pin&mobile_number=ilike.*${suffix}&limit=5`;
    }

    const fetchResp = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!fetchResp.ok) {
      const errText = await fetchResp.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch {}
      if (errJson && errJson.code === '42703') {
        return res.status(500).json({
          ok: false,
          error: 'Database column access_pin not found. Execute migration first.',
        });
      }
      return res.status(500).json({ ok: false, error: 'Database lookup failed.' });
    }

    const rows = await fetchResp.json();
    const student = Array.isArray(rows)
      ? (studentId ? rows[0] : rows.find((s) => cleanSuffix(s.mobile_number) === suffix) || rows[0])
      : null;

    if (!student) {
      return res.status(404).json({ ok: false, error: 'Student record not found.' });
    }

    if (!student.access_pin) {
      return res.status(400).json({
        ok: false,
        error: 'Passkey not found. Contact admin.',
      });
    }

    const currentDecrypted = decryptPasskey(student.access_pin);
    if (!currentDecrypted) {
      return res.status(500).json({
        ok: false,
        error: 'Invalid passkey. Check case & retry.',
      });
    }

    if (candidatePasskey !== currentDecrypted) {
      recordFailure(rateLimitKey);
      return res.status(401).json({
        ok: false,
        error: 'Invalid passkey. Check case & retry.',
      });
    }

    clearFailures(rateLimitKey);

    // ROTATE PASSKEY IMMEDIATELY
    const freshPlaintext = generatePasskey(6);
    const freshEncrypted = encryptPasskey(freshPlaintext);

    await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(student.id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        access_pin: freshEncrypted,
        passkey_updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      ok: true,
      message: 'Passkey verified successfully.',
      student: {
        id: student.id,
        name: student.name,
      },
    });
  } catch (err) {
    console.error('verify-passkey error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error.' });
  }
};

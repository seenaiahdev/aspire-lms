// Production Express handler: verify-passkey with single-use auto-rotation
const { decryptPasskey, encryptPasskey, generatePasskey, createSessionToken } = require('../lib/passkey-crypto');
const cache = require('../lib/cache');
const { cleanPhoneSuffix } = require('../lib/utils');
const { getSupabaseClient } = require('../lib/supabase');

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
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const supabase = getSupabaseClient();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const studentId = String(body.studentId || '').trim();
    const phone = String(body.phone || '').trim();
    const candidatePasskey = String(body.passkey || '').trim();

    const suffix = cleanPhoneSuffix(phone);
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

    const endpoint = studentId
      ? `/students?select=id,name,mobile_number,access_pin&id=eq.${encodeURIComponent(studentId)}&limit=1`
      : `/students?select=id,name,mobile_number,access_pin&mobile_number=ilike.*${suffix}&limit=5`;

    const fetchResp = await supabase.authFetch(endpoint);

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
      ? (studentId ? rows[0] : rows.find((s) => cleanPhoneSuffix(s.mobile_number) === suffix) || rows[0])
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
    const nowIso = new Date().toISOString();

    let updated = false;
    try {
      const rpcResp = await supabase.authFetch('/rpc/update_student_passkey', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          p_student_id: student.id,
          p_access_pin: freshEncrypted,
          p_updated_at: nowIso,
        }),
      });
      if (rpcResp.ok) updated = true;
    } catch {}

    if (!updated) {
      await supabase.authFetch(`/students?id=eq.${encodeURIComponent(student.id)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          access_pin: freshEncrypted,
          passkey_updated_at: nowIso,
        }),
      });
    }

    cache.invalidate(`student_id:${student.id}`);
    if (student.mobile_number) {
      cache.invalidate(`student_phone:${cleanPhoneSuffix(student.mobile_number)}`);
    }

    // SEC-06: Issue cryptographically signed session token
    const tokenPayload = {
      studentId: student.id,
      phone: cleanPhoneSuffix(student.mobile_number || phone),
      name: student.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };
    const token = createSessionToken(tokenPayload);

    return res.status(200).json({
      ok: true,
      message: 'Passkey verified successfully.',
      token,
      user: {
        id: student.id,
        name: student.name,
        mobileNumber: student.mobile_number,
      },
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

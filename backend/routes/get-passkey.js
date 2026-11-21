// Production Express handler: get-passkey for Admin
const crypto = require('crypto');
const { decryptPasskey, encryptPasskey, generatePasskey } = require('../lib/passkey-crypto');
const cache = require('../lib/cache');
const { cleanPhoneSuffix } = require('../lib/utils');
const { getSupabaseClient } = require('../lib/supabase');

module.exports = async (req, res) => {
  // SEC-01: Admin Authorization Lockdown — Require valid admin secret
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'] || req.headers['x-api-key'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : String(authHeader).trim();

  const adminSecret = (process.env.ADMIN_SECRET || '').trim();
  const passkeySecret = (process.env.PASSKEY_SECRET || '').trim();
  const validSecrets = [adminSecret, passkeySecret].filter((s) => s && s.length >= 16);

  let isAuthorized = false;
  if (bearerToken && validSecrets.length > 0) {
    for (const sec of validSecrets) {
      if (bearerToken.length === sec.length && crypto.timingSafeEqual(Buffer.from(bearerToken), Buffer.from(sec))) {
        isAuthorized = true;
        break;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: Admin authorization required'
    });
  }

  const supabase = getSupabaseClient();

  try {
    const query = req.query || {};
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const studentId = String(query.studentId || body.studentId || '').trim();
    const phone = String(query.phone || body.phone || '').trim();
    const action = String(query.action || body.action || 'get').trim();

    const suffix = cleanPhoneSuffix(phone);
    if (!studentId && suffix.length < 10) {
      return res.status(400).json({ ok: false, error: 'Provide studentId or a 10-digit phone number.' });
    }

    const cacheKey = studentId ? `student_id:${studentId}` : `student_phone:${suffix}`;
    let student = null;

    if (action !== 'regenerate') {
      student = cache.get(cacheKey);
    }

    if (!student) {
      const endpoint = studentId
        ? `/students?select=id,name,email,mobile_number,access_pin,passkey_updated_at&id=eq.${encodeURIComponent(studentId)}&limit=1`
        : `/students?select=id,name,email,mobile_number,access_pin,passkey_updated_at&mobile_number=ilike.*${suffix}&limit=5`;

      const fetchResp = await supabase.authFetch(endpoint);

      if (!fetchResp.ok) {
        return res.status(500).json({ ok: false, error: 'Database query failed' });
      }

      const rows = await fetchResp.json();
      student = Array.isArray(rows)
        ? (studentId ? rows[0] : rows.find((s) => cleanPhoneSuffix(s.mobile_number) === suffix) || rows[0])
        : null;

      if (!student) {
        return res.status(404).json({ ok: false, error: 'Student not found.' });
      }

      if (action !== 'regenerate') {
        cache.set(cacheKey, student, 60_000);
        if (student.id) cache.set(`student_id:${student.id}`, student, 60_000);
        if (student.mobile_number) cache.set(`student_phone:${cleanPhoneSuffix(student.mobile_number)}`, student, 60_000);
      }
    }

    let activePasskey = null;
    if (student.access_pin && action !== 'regenerate') {
      activePasskey = decryptPasskey(student.access_pin);
    }

    if (!activePasskey || action === 'regenerate') {
      activePasskey = generatePasskey(6);
      const enc = encryptPasskey(activePasskey);
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
            p_access_pin: enc,
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
            access_pin: enc,
            passkey_updated_at: nowIso,
          }),
        });
      }

      student.access_pin = enc;
      student.passkey_updated_at = nowIso;
      cache.invalidate(`student_id:${student.id}`);
      if (student.mobile_number) cache.invalidate(`student_phone:${cleanPhoneSuffix(student.mobile_number)}`);
      cache.set(`student_id:${student.id}`, student, 60_000);
      if (student.mobile_number) cache.set(`student_phone:${cleanPhoneSuffix(student.mobile_number)}`, student, 60_000);
    }

    return res.status(200).json({
      ok: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        mobileNumber: student.mobile_number,
        activePasskey,
        lastUpdated: student.passkey_updated_at || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('get-passkey error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

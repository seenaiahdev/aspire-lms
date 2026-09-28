// Production Express handler: get-passkey for Admin
const { decryptPasskey, encryptPasskey, generatePasskey } = require('../lib/passkey-crypto');

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

module.exports = async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co';
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';

  try {
    const query = req.query || {};
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const studentId = String(query.studentId || body.studentId || '').trim();
    const phone = String(query.phone || body.phone || '').trim();
    const action = String(query.action || body.action || 'get').trim();

    const suffix = cleanSuffix(phone);
    if (!studentId && suffix.length < 10) {
      return res.status(400).json({ ok: false, error: 'Provide studentId or a 10-digit phone number.' });
    }

    let url = '';
    if (studentId) {
      url = `${SUPABASE_URL}/rest/v1/students?select=id,name,email,mobile_number,access_pin,passkey_updated_at&id=eq.${encodeURIComponent(studentId)}&limit=1`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/students?select=id,name,email,mobile_number,access_pin,passkey_updated_at&mobile_number=ilike.*${suffix}&limit=5`;
    }

    const fetchResp = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!fetchResp.ok) {
      return res.status(500).json({ ok: false, error: 'Database query failed' });
    }

    const rows = await fetchResp.json();
    const student = Array.isArray(rows)
      ? (studentId ? rows[0] : rows.find((s) => cleanSuffix(s.mobile_number) === suffix) || rows[0])
      : null;

    if (!student) {
      return res.status(404).json({ ok: false, error: 'Student not found.' });
    }

    let activePasskey = null;
    if (student.access_pin && action !== 'regenerate') {
      activePasskey = decryptPasskey(student.access_pin);
    }

    if (!activePasskey || action === 'regenerate') {
      activePasskey = generatePasskey(6);
      const enc = encryptPasskey(activePasskey);

      await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(student.id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON,
          authorization: `Bearer ${SUPABASE_ANON}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          access_pin: enc,
          passkey_updated_at: new Date().toISOString(),
        }),
      });
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

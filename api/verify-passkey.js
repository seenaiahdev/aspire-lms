// Vercel serverless function: verifies the Admin Alphanumeric Passkey entered by the student.
// On successful verification, immediately rotates the key (generates a fresh 6-char alphanumeric key,
// encrypts it with AES-256-GCM, and updates Supabase), preventing replay attacks or account sharing.

const { decryptPasskey, encryptPasskey, generatePasskey } = require('./passkey-crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';

const cleanSuffix = (p) => String(p || '').replace(/\D/g, '').slice(-10);

// In-memory rate limiting per student/phone
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after 5 failures
const attemptsByTarget = new Map(); // target -> { count, expiry }

function checkRateLimit(key) {
  const now = Date.now();
  const rec = attemptsByTarget.get(key);
  if (rec && rec.expiry > now && rec.count >= MAX_ATTEMPTS) {
    const remainingMinutes = Math.ceil((rec.expiry - now) / 60000);
    return {
      allowed: false,
      error: `Too many incorrect attempts. Please wait ${remainingMinutes} minute(s) or contact your administrator.`,
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const studentId = String(body.studentId || '').trim();
    const phone = String(body.phone || '').trim();
    const candidatePasskey = String(body.passkey || '').trim();

    const suffix = cleanSuffix(phone);
    const rateLimitKey = studentId || suffix || 'unknown';

    if (!candidatePasskey) {
      return res.status(400).json({ ok: false, error: 'Please enter your Admin Passkey.' });
    }

    if (!studentId && suffix.length < 10) {
      return res.status(400).json({ ok: false, error: 'Student identification required.' });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ ok: false, error: rateCheck.error });
    }

    // 1. Fetch student from Supabase
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
      try { errJson = JSON.parse(errText); } catch { /* ignore */ }
      if (errJson && errJson.code === '42703') {
        return res.status(500).json({
          ok: false,
          error: 'Database column access_pin not found. Please execute the migration in Supabase SQL editor.',
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

    // 2. Validate current stored passkey
    if (!student.access_pin) {
      return res.status(400).json({
        ok: false,
        error: 'No active passkey has been issued for your account. Please contact your administrator to generate one.',
      });
    }

    const currentDecrypted = decryptPasskey(student.access_pin);
    if (!currentDecrypted) {
      return res.status(500).json({
        ok: false,
        error: 'Passkey encryption error. Please contact administrator to re-generate your passkey.',
      });
    }

    // Strict case-sensitive match
    if (candidatePasskey !== currentDecrypted) {
      recordFailure(rateLimitKey);
      return res.status(401).json({
        ok: false,
        error: 'Invalid Access Passkey. Please verify uppercase/lowercase characters and try again.',
      });
    }

    // 3. Passkey MATCHED! Clear failures
    clearFailures(rateLimitKey);

    // 4. ROTATE PASSKEY IMMEDIATELY:
    // Generate fresh 6-char alphanumeric key (guaranteed upper, lower, digit)
    const freshPlaintext = generatePasskey(6);
    const freshEncrypted = encryptPasskey(freshPlaintext);

    // Update in Supabase
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(student.id)}`, {
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

    if (!patchResp.ok) {
      console.warn('Failed to rotate passkey in database, but candidate was valid.');
    }

    return res.status(200).json({
      ok: true,
      message: 'Passkey verified successfully. Access granted.',
      student: {
        id: student.id,
        name: student.name,
      },
    });
  } catch (err) {
    console.error('verify-passkey error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error verifying passkey.' });
  }
};

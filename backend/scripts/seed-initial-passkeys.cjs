/**
 * Seed / Initialize Alphanumeric Passkeys for Existing Students
 * Run via: node backend/scripts/seed-initial-passkeys.cjs
 */
const fs = require('fs');
const path = require('path');
const { generatePasskey, encryptPasskey, decryptPasskey } = require('../lib/passkey-crypto.js');

// Load env from possible locations
let envContent = '';
const candidateEnvPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../frontend/.env'),
];

for (const p of candidateEnvPaths) {
  try {
    if (fs.existsSync(p)) {
      envContent += '\n' + fs.readFileSync(p, 'utf8');
    }
  } catch {}
}

const urlMatch = envContent.match(/(?:VITE_)?SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envContent.match(/(?:VITE_)?SUPABASE_ANON_KEY\s*=\s*(.*)/);
const otpMatch = envContent.match(/OTP_SECRET\s*=\s*(.*)/);
const passkeyMatch = envContent.match(/PASSKEY_SECRET\s*=\s*(.*)/);

if (otpMatch) process.env.OTP_SECRET = otpMatch[1].trim();
if (passkeyMatch) process.env.PASSKEY_SECRET = passkeyMatch[1].trim();

const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : (process.env.SUPABASE_URL || 'https://maahwymvereyofrhrytx.supabase.co');
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : (process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM');

async function run() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  // 1. Fetch all students
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id,name,email,mobile_number,access_pin`, {
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let errJson;
    try { errJson = JSON.parse(errText); } catch {}
    if (errJson && errJson.code === '42703') {
      console.error('\n❌ ERROR: Column "access_pin" does not exist in Supabase yet!');
      console.log('\nPlease run this SQL in your Supabase Project -> SQL Editor:\n');
      console.log('----------------------------------------------------------------------');
      console.log('ALTER TABLE public.students');
      console.log('ADD COLUMN IF NOT EXISTS access_pin TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS passkey_updated_at TIMESTAMPTZ DEFAULT NOW();');
      console.log('----------------------------------------------------------------------\n');
      process.exit(1);
    }
    console.error('Failed to query students:', resp.status, errText);
    process.exit(1);
  }

  const students = await resp.json();
  console.log(`Found ${students.length} student(s) in database.\n`);

  const results = [];

  for (const student of students) {
    let plainPasskey = '';
    // If student already has an access_pin, we can decrypt it or generate a fresh one
    if (student.access_pin) {
      plainPasskey = decryptPasskey(student.access_pin);
    }

    if (!plainPasskey) {
      plainPasskey = generatePasskey(6);
      const enc = encryptPasskey(plainPasskey);

      const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(student.id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          access_pin: enc,
          passkey_updated_at: new Date().toISOString(),
        }),
      });

      if (!updateResp.ok) {
        console.warn(`Failed to update student ${student.name}:`, await updateResp.text());
      }
    }

    results.push({
      Name: student.name,
      Mobile: student.mobile_number,
      'Active Passkey': plainPasskey,
      'Encrypted (preview)': (student.access_pin || '').substring(0, 24) + '...',
    });
  }

  console.table(results);
  console.log('\n✅ All students have active encrypted alphanumeric passkeys ready for testing!');
}

run().catch((err) => {
  console.error('Fatal error:', err);
});

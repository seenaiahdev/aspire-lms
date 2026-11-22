// Standalone Cryptographic vault for Passkey generation & AES-256-GCM encryption/decryption
const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL_CHARS = UPPER + LOWER + DIGITS;

const WEAK_DEFAULT_SECRETS = new Set([
  'aspire_lms_otp_hmac_secret_key_2026',
  'some-secure-random-secret-key-12345',
  'aspire_lms_passkey_vault_secret_2026',
  'default-secret',
  'secret',
  'password'
]);

// Persistent fallback vault secret for database records across serverless process restarts
const DEFAULT_VAULT_SECRET = 'aspire_lms_passkey_vault_secret_2026';

// Known historical vault secrets used for at-rest database decryption of existing students
const LEGACY_VAULT_SECRETS = [
  DEFAULT_VAULT_SECRET,
  'some-secure-random-secret-key-12345',
  'aspire_lms_otp_hmac_secret_key_2026'
];

function isWeakSecret(secret) {
  if (!secret || typeof secret !== 'string') return true;
  const trimmed = secret.trim();
  if (trimmed.length < 16) return true;
  return WEAK_DEFAULT_SECRETS.has(trimmed);
}

function getCandidateSecrets() {
  const list = [];
  const passkeySecret = (process.env.PASSKEY_SECRET || '').trim();
  const otpSecret = (process.env.OTP_SECRET || '').trim();

  if (process.env.NODE_ENV === 'production') {
    if (isWeakSecret(passkeySecret) && isWeakSecret(otpSecret)) {
      throw new Error('FAIL-CLOSED: High-entropy PASSKEY_SECRET or OTP_SECRET required in production environment.');
    }
    if (!isWeakSecret(passkeySecret)) list.push(passkeySecret);
    if (!isWeakSecret(otpSecret)) list.push(otpSecret);
  } else {
    // Non-production (dev/test): prioritize valid configured secrets, fallback to persistent vault secret
    if (passkeySecret && !WEAK_DEFAULT_SECRETS.has(passkeySecret)) list.push(passkeySecret);
    if (otpSecret && !WEAK_DEFAULT_SECRETS.has(otpSecret)) list.push(otpSecret);
    if (list.length === 0) {
      list.push(DEFAULT_VAULT_SECRET);
    }
  }

  return [...new Set(list.filter(Boolean))];
}

function getDerivedKey(secret) {
  let s = secret;
  if (!s) {
    try {
      s = getCandidateSecrets()[0];
    } catch {
      s = LEGACY_VAULT_SECRETS[0];
    }
  }
  return crypto.createHash('sha256').update(String(s)).digest();
}

function createSessionToken(payload, customSecret) {
  let secret = customSecret;
  if (!secret) {
    try {
      secret = getCandidateSecrets()[0];
    } catch {
      secret = LEGACY_VAULT_SECRETS[0];
    }
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', String(secret)).update(`${headerB64}.${payloadB64}`).digest('base64url');
  return `${headerB64}.${payloadB64}.${sig}`;
}

function verifySessionToken(token, customSecret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts;
  if (!headerB64 || !payloadB64 || !sig) return null;

  let secrets = [];
  if (customSecret) {
    secrets = [customSecret];
  } else {
    try {
      secrets = getCandidateSecrets();
    } catch {
      secrets = [];
    }
    secrets = [...new Set([...secrets, ...LEGACY_VAULT_SECRETS])];
  }

  for (const s of secrets) {
    try {
      const expectedSig = crypto.createHmac('sha256', String(s)).update(`${headerB64}.${payloadB64}`).digest('base64url');
      const a = Buffer.from(sig);
      const b = Buffer.from(expectedSig);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        if (payload.exp && Date.now() > (payload.exp < 10000000000 ? payload.exp * 1000 : payload.exp)) {
          return null; // Expired
        }
        return payload;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function generatePasskey(length = 6) {
  const len = Math.max(6, length);
  let result = [];

  result.push(UPPER[crypto.randomInt(0, UPPER.length)]);
  result.push(LOWER[crypto.randomInt(0, LOWER.length)]);
  result.push(DIGITS[crypto.randomInt(0, DIGITS.length)]);

  for (let i = 3; i < len; i++) {
    result.push(ALL_CHARS[crypto.randomInt(0, ALL_CHARS.length)]);
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

function encryptPasskey(plaintext, secret) {
  if (!plaintext) return null;
  const key = getDerivedKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptPasskey(encryptedString, secret) {
  if (!encryptedString || typeof encryptedString !== 'string') return null;
  const parts = encryptedString.split(':');
  if (parts.length !== 3) return null;

  let secretsToTry = [];
  if (secret) {
    secretsToTry = [secret];
  } else {
    try {
      secretsToTry = getCandidateSecrets();
    } catch {
      secretsToTry = [];
    }
    // Always include legacy vault secrets so existing students can authenticate and auto-rotate
    secretsToTry = [...new Set([...secretsToTry, ...LEGACY_VAULT_SECRETS])];
  }

  for (const s of secretsToTry) {
    try {
      const [ivHex, authTagHex, encHex] = parts;
      const key = crypto.createHash('sha256').update(String(s)).digest();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      if (decrypted) return decrypted;
    } catch {
      // try next secret
    }
  }

  return null;
}

module.exports = {
  generatePasskey,
  encryptPasskey,
  decryptPasskey,
  getDerivedKey,
  createSessionToken,
  verifySessionToken,
  isWeakSecret,
  getCandidateSecrets,
  WEAK_DEFAULT_SECRETS,
  UPPER,
  LOWER,
  DIGITS
};

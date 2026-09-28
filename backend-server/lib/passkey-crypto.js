// Standalone Cryptographic vault for Passkey generation & AES-256-GCM encryption/decryption
const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL_CHARS = UPPER + LOWER + DIGITS;

function getCandidateSecrets() {
  const list = [];
  if (process.env.PASSKEY_SECRET) list.push(process.env.PASSKEY_SECRET);
  if (process.env.OTP_SECRET) list.push(process.env.OTP_SECRET);
  list.push('some-secure-random-secret-key-12345');
  list.push('aspire_lms_passkey_vault_secret_2026');
  return [...new Set(list.filter(Boolean))];
}

function getDerivedKey(secret) {
  const s = secret || getCandidateSecrets()[0];
  return crypto.createHash('sha256').update(String(s)).digest();
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

  const secretsToTry = secret ? [secret] : getCandidateSecrets();

  for (const s of secretsToTry) {
    try {
      const [ivHex, authTagHex, encHex] = parts;
      const key = getDerivedKey(s);
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
  UPPER,
  LOWER,
  DIGITS
};

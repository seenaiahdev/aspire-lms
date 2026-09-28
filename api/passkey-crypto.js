// Utility functions for Passkey generation, AES-256-GCM encryption & decryption
const crypto = require('crypto');

// Upper, Lower, Numbers excluding ambiguous glyphs (O, 0, I, l, 1) for readability,
// while still accepting any alphanumeric character during user input verification.
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

/**
 * Derives a 32-byte (256-bit) buffer from the secret string using SHA-256.
 */
function getDerivedKey(secret) {
  const s = secret || getCandidateSecrets()[0];
  return crypto.createHash('sha256').update(String(s)).digest();
}

/**
 * Generates an alphanumeric passkey of specified length (default 6),
 * guaranteed to contain at least 1 uppercase, 1 lowercase, and 1 digit.
 */
function generatePasskey(length = 6) {
  const len = Math.max(6, length);
  let result = [];

  // Guarantee at least one of each required character type
  result.push(UPPER[crypto.randomInt(0, UPPER.length)]);
  result.push(LOWER[crypto.randomInt(0, LOWER.length)]);
  result.push(DIGITS[crypto.randomInt(0, DIGITS.length)]);

  // Fill remaining slots
  for (let i = 3; i < len; i++) {
    result.push(ALL_CHARS[crypto.randomInt(0, ALL_CHARS.length)]);
  }

  // Fisher-Yates shuffle so character positions are unpredictable
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

/**
 * Encrypts a plaintext passkey using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
function encryptPasskey(plaintext, secret) {
  if (!plaintext) return null;
  const key = getDerivedKey(secret);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string encrypted with AES-256-GCM.
 * Supports fallback secrets to ensure seamless cross-environment decryption.
 */
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
      // try next candidate secret
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

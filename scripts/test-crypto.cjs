const { generatePasskey, encryptPasskey, decryptPasskey } = require('../api/passkey-crypto.js');

console.log('Testing Passkey Generator and AES-256-GCM Encryption:\n');
for (let i = 0; i < 5; i++) {
  const p = generatePasskey(6);
  const enc = encryptPasskey(p);
  const dec = decryptPasskey(enc);
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasDigit = /[0-9]/.test(p);
  console.log(`Passkey: ${p} | Upper: ${hasUpper} | Lower: ${hasLower} | Digit: ${hasDigit} | Match: ${p === dec}`);
}

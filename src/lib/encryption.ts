import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secret = process.env.ENCRYPTION_SECRET || 'd82c41c9a174f885e492209d73d6b1d4'; // Fallback for dev

export function encrypt(text: string) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(secret).digest();

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (e) {
    return text; // Fallback to plain text on error
  }
}

export function decrypt(hash: string) {
  if (!hash || typeof hash !== 'string' || !hash.includes(':')) return hash;
  
  try {
    const parts = hash.split(':');
    if (parts.length !== 2) return hash;
    
    const [ivHex, encrypted] = parts;
    if (ivHex.length !== 32) return hash; // IV must be 16 bytes (32 hex chars)

    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(secret).digest();

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    return hash; // If decryption fails, return the original string (might be plain text that happens to have a colon)
  }
}

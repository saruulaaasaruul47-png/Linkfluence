import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const VERSION = 'v1';

function encryptionKey() {
  const configured = env.socialTokenEncryptionKey.trim();
  if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
  if (configured) {
    const decoded = Buffer.from(configured, 'base64');
    if (decoded.length === 32) return decoded;
    throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY must be 32-byte base64 or 64-character hex.');
  }
  if (env.nodeEnv === 'production') throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY is required.');
  return createHash('sha256').update(`${env.jwtRefreshSecret}:social-token-dev-key`).digest();
}

export function encryptSocialToken(value) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSocialToken(value) {
  if (!value) return null;
  try {
    const [version, iv, tag, encrypted] = value.split('.');
    if (version !== VERSION || !iv || !tag || !encrypted) throw new Error('Malformed token envelope.');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new AppError('The social connection must be authorized again.', 409, 'SOCIAL_TOKEN_DECRYPTION_FAILED');
  }
}


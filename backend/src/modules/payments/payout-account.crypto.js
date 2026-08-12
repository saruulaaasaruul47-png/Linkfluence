import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

function key() {
  return createHash('sha256').update(env.payoutAccountEncryptionKey || env.jwtAccessSecret).digest();
}

export function encryptPayoutAccount(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

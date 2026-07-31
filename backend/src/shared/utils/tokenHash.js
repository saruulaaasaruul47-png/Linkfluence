import { createHash, timingSafeEqual } from 'node:crypto';

export function hashToken(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function safeHashEqual(leftHash, rightHash) {
  const left = Buffer.from(leftHash, 'hex');
  const right = Buffer.from(rightHash, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

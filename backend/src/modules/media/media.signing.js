import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

function signature(value) {
  return crypto.createHmac('sha256', env.mediaSigningSecret).update(value).digest('hex');
}

export function createMediaSignature({ action, assetId = '', ownerId = '', purpose = '', expires }) {
  return signature([action, assetId, ownerId, purpose, expires].join(':'));
}

export function verifyMediaSignature(input, provided) {
  if (!provided || Number(input.expires) <= Math.floor(Date.now() / 1000)) {
    throw new AppError('The signed media URL has expired.', 401, 'SIGNED_URL_EXPIRED');
  }
  const expected = createMediaSignature(input);
  const left = Buffer.from(expected);
  const right = Buffer.from(String(provided));
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new AppError('The signed media URL is invalid.', 401, 'SIGNED_URL_INVALID');
  }
}

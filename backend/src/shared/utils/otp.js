import { randomInt } from 'node:crypto';
import { env } from '../../config/env.js';

export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

export function otpExpiresAt(from = new Date()) {
  return new Date(from.getTime() + env.otpExpiresInMinutes * 60 * 1000);
}

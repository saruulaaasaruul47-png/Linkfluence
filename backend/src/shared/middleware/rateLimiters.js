import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AUTH_ERROR } from '../constants/auth.constants.js';

function createLimiter(limit) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.nodeEnv === 'test',
    handler(_req, res) {
      res.status(429).json({
        success: false,
        error: {
          code: AUTH_ERROR.RATE_LIMIT,
          message: 'Too many requests. Please wait and try again.',
          details: null,
        },
      });
    },
  });
}

export const registerLimiter = createLimiter(5);
export const loginLimiter = createLimiter(10);
export const verifyOtpLimiter = createLimiter(10);
export const resendOtpLimiter = createLimiter(5);
export const refreshLimiter = createLimiter(30);
export const forgotPasswordLimiter = createLimiter(5);
export const resetOtpLimiter = createLimiter(10);
export const resetPasswordLimiter = createLimiter(5);
export const apiLimiter = createLimiter(300);

import { Router } from 'express';
import {
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resendOtpLimiter,
  resetOtpLimiter,
  resetPasswordLimiter,
  verifyOtpLimiter,
} from '../../shared/middleware/rateLimiters.js';
import { validate } from '../../shared/middleware/validate.js';
import { authController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyResetOtpSchema,
} from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validate(registerSchema), authController.register);
authRouter.post('/verify-email', verifyOtpLimiter, validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/resend-otp', resendOtpLimiter, validate(resendOtpSchema), authController.resendOtp);
authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRouter.post('/refresh', refreshLimiter, authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/logout-all', authenticate, authController.logoutAll);
authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  '/verify-reset-otp',
  resetOtpLimiter,
  validate(verifyResetOtpSchema),
  authController.verifyResetOtp,
);
authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.get('/me', authenticate, authController.getCurrentUser);

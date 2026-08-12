import asyncHandler from 'express-async-handler';
import { env } from '../../config/env.js';
import { refreshCookieOptions } from '../../shared/utils/cookie.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { authService } from './auth.service.js';

function setRefreshCookie(res, refreshToken, persistent = true) {
  res.cookie(env.refreshCookieName, refreshToken, refreshCookieOptions({ persistent }));
}

const requestContext = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.validated.body);
    sendSuccess(res, 201, 'Verification code has been sent to your email.', data);
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.validated.body, requestContext(req));
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, 200, 'Email verified successfully.', {
      user: result.user,
      accessToken: result.accessToken,
    });
  }),

  resendOtp: asyncHandler(async (req, res) => {
    await authService.resendOtp(req.validated.body);
    sendSuccess(
      res,
      200,
      'If the account exists and requires verification, a new code has been sent.',
      null,
    );
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.validated.body, {
      ...requestContext(req),
      persistent: req.validated.body.remember,
    });
    setRefreshCookie(res, result.refreshToken, result.persistent);
    sendSuccess(res, 200, 'Signed in successfully.', {
      user: result.user,
      accessToken: result.accessToken,
    });
  }),

  googleLogin: asyncHandler(async (req, res) => {
    const result = await authService.googleLogin(req.validated.body, requestContext(req));
    setRefreshCookie(res, result.refreshToken, result.persistent);
    sendSuccess(res, 200, 'Signed in with Google successfully.', {
      user: result.user,
      accessToken: result.accessToken,
    });
  }),

  refresh: asyncHandler(async (req, res) => {
    const result = await authService.refresh(
      req.cookies?.[env.refreshCookieName],
      requestContext(req),
    );
    setRefreshCookie(res, result.refreshToken, result.persistent);
    sendSuccess(res, 200, 'Token refreshed successfully.', {
      accessToken: result.accessToken,
    });
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[env.refreshCookieName]);
    res.clearCookie(env.refreshCookieName, refreshCookieOptions({ clear: true }));
    sendSuccess(res, 200, 'Logged out successfully.', null);
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);
    res.clearCookie(env.refreshCookieName, refreshCookieOptions({ clear: true }));
    sendSuccess(res, 200, 'Logged out from all devices successfully.', null);
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.validated.body);
    sendSuccess(
      res,
      200,
      'If an eligible account exists, a password reset code has been sent.',
      null,
    );
  }),

  verifyResetOtp: asyncHandler(async (req, res) => {
    const data = await authService.verifyResetOtp(req.validated.body);
    sendSuccess(res, 200, 'Password reset code verified successfully.', data);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.validated.body);
    res.clearCookie(env.refreshCookieName, refreshCookieOptions({ clear: true }));
    sendSuccess(res, 200, 'Password reset successfully.', {
      reauthenticationRequired: true,
    });
  }),

  getCurrentUser: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    sendSuccess(res, 200, 'Current user retrieved successfully.', { user });
  }),
};

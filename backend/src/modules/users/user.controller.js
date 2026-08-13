import asyncHandler from 'express-async-handler';
import { env } from '../../config/env.js';
import { refreshCookieOptions } from '../../shared/utils/cookie.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { userService } from './user.service.js';

export const userController = {
  getMe: asyncHandler(async (req, res) => {
    const user = await userService.getMe(req.user.id);
    sendSuccess(res, 200, 'Profile retrieved successfully.', { user });
  }),

  exportMe: asyncHandler(async (req, res) => {
    const data = await userService.exportMe(req.user.id);
    const date = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="influence-hub-account-${date}.json"`);
    res.status(200).send(JSON.stringify(data, null, 2));
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateMe(req.user.id, req.validated.body);
    sendSuccess(res, 200, 'Profile updated successfully.', { user });
  }),

  updateAvatar: asyncHandler(async (req, res) => {
    const user = await userService.updateAvatar(req.user.id, req.file);
    sendSuccess(res, 200, 'Avatar updated successfully.', { user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const data = await userService.changePassword(req.user.id, req.validated.body);
    res.clearCookie(env.refreshCookieName, refreshCookieOptions({ clear: true }));
    sendSuccess(res, 200, 'Password updated. Please sign in again.', data);
  }),

  deleteMe: asyncHandler(async (req, res) => {
    await userService.deleteMe(req.user.id);
    res.clearCookie(env.refreshCookieName, refreshCookieOptions({ clear: true }));
    sendSuccess(res, 200, 'Account deleted successfully.', null);
  }),
};

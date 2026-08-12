import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { notificationService } from './notification.service.js';
export const notificationController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Notifications retrieved.', await notificationService.list(req.user.id, req.validated.query))),
  preference: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Notification preferences retrieved.', { preference: await notificationService.preference(req.user.id) })),
  savePreference: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Notification preferences updated.', { preference: await notificationService.savePreference(req.user.id, req.validated.body) })),
  read: asyncHandler(async (req, res) => { await notificationService.read(req.user.id, req.validated.params.id); sendSuccess(res, 200, 'Notification marked read.'); }),
  readAll: asyncHandler(async (req, res) => { await notificationService.readAll(req.user.id); sendSuccess(res, 200, 'Notifications marked read.'); }),
};

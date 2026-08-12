import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { safetyService } from './safety.service.js';

export const safetyController = {
  state: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Safety preferences loaded.', await safetyService.state(req.user.id))),
  block: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel blocked.', await safetyService.block(req.user.id, req.validated.params.targetType, req.validated.params.targetId))),
  unblock: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel unblocked.', await safetyService.unblock(req.user.id, req.validated.params.targetType, req.validated.params.targetId))),
  mute: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel muted.', await safetyService.mute(req.user.id, req.validated.params.targetType, req.validated.params.targetId))),
  unmute: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel unmuted.', await safetyService.unmute(req.user.id, req.validated.params.targetType, req.validated.params.targetId))),
  report: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Report submitted for review.', { report: await safetyService.report(req.user.id, req.validated.body) })),
};

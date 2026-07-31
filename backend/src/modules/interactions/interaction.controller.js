import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { interactionService } from './interaction.service.js';

export const interactionController = {
  state: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Library state loaded.', await interactionService.state(req.user.id));
  }),
  save: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validated.params;
    sendSuccess(res, 200, 'Item saved.', await interactionService.save(req.user.id, targetType, targetId));
  }),
  unsave: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validated.params;
    sendSuccess(res, 200, 'Item removed from saved.', await interactionService.unsave(req.user.id, targetType, targetId));
  }),
  follow: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validated.params;
    sendSuccess(res, 200, 'Channel followed.', await interactionService.follow(req.user.id, targetType, targetId));
  }),
  unfollow: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validated.params;
    sendSuccess(res, 200, 'Channel unfollowed.', await interactionService.unfollow(req.user.id, targetType, targetId));
  }),
  recent: asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validated.body;
    sendSuccess(res, 200, 'Recent view recorded.', await interactionService.recent(req.user.id, targetType, targetId));
  }),
  share: asyncHandler(async (req, res) => {
    const { targetType, targetId, channel } = req.validated.body;
    sendSuccess(res, 201, 'Share event recorded.', await interactionService.share(req.user.id, targetType, targetId, channel));
  }),
};

import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { creatorService } from './creator.service.js';

export const creatorController = {
  create: asyncHandler(async (req, res) => {
    const data = await creatorService.create(req.user.id, req.validated.body);
    sendSuccess(res, 201, 'Creator profile created successfully.', data);
  }),
  get: asyncHandler(async (req, res) => {
    const profile = await creatorService.get(req.user.id);
    sendSuccess(res, 200, 'Creator profile retrieved successfully.', { profile });
  }),
  update: asyncHandler(async (req, res) => {
    const profile = await creatorService.update(req.user.id, req.validated.body);
    sendSuccess(res, 200, 'Creator profile updated successfully.', { profile });
  }),
  remove: asyncHandler(async (req, res) => {
    const user = await creatorService.remove(req.user.id);
    sendSuccess(res, 200, 'Creator profile deleted successfully.', { user });
  }),
};

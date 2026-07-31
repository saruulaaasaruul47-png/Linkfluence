import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { portfolioService } from './portfolio.service.js';

export const portfolioController = {
  listMine: asyncHandler(async (req, res) => {
    const items = await portfolioService.listMine(req.user.id);
    sendSuccess(res, 200, 'Portfolio retrieved successfully.', { items });
  }),
  create: asyncHandler(async (req, res) => {
    const item = await portfolioService.create(req.user.id, req.validated.body);
    sendSuccess(res, 201, 'Portfolio item created successfully.', { item });
  }),
  update: asyncHandler(async (req, res) => {
    const item = await portfolioService.update(
      req.user.id,
      req.validated.params.id,
      req.validated.body,
    );
    sendSuccess(res, 200, 'Portfolio item updated successfully.', { item });
  }),
  remove: asyncHandler(async (req, res) => {
    await portfolioService.remove(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Portfolio item deleted successfully.', null);
  }),
  getPublic: asyncHandler(async (req, res) => {
    const item = await portfolioService.getPublic(req.validated.params.id);
    sendSuccess(res, 200, 'Portfolio item retrieved successfully.', { item });
  }),
};

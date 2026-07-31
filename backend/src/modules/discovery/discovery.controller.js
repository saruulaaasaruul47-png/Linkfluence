import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { discoveryService } from './discovery.service.js';

export const discoveryController = {
  discover: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Marketplace discovery loaded.', await discoveryService.discover(req.validated.query.limit));
  }),
  search: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Search completed.', await discoveryService.search(req.validated.query));
  }),
};

import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { marketplaceService } from './marketplace.service.js';

export const marketplaceController = {
  creators: asyncHandler(async (req, res) => {
    const data = await marketplaceService.listCreators(req.validated.query);
    sendSuccess(res, 200, 'Creators retrieved successfully.', data);
  }),
  creator: asyncHandler(async (req, res) => {
    const creator = await marketplaceService.getCreator(req.validated.params.id);
    sendSuccess(res, 200, 'Creator retrieved successfully.', { creator });
  }),
  businesses: asyncHandler(async (req, res) => {
    const data = await marketplaceService.listBusinesses(req.validated.query);
    sendSuccess(res, 200, 'Businesses retrieved successfully.', data);
  }),
  business: asyncHandler(async (req, res) => {
    const business = await marketplaceService.getBusiness(req.validated.params.id);
    sendSuccess(res, 200, 'Business retrieved successfully.', { business });
  }),
  categories: asyncHandler(async (_req, res) => {
    const categories = await marketplaceService.categories();
    sendSuccess(res, 200, 'Categories retrieved successfully.', { categories });
  }),
};

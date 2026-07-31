import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { reviewService } from './review.service.js';
export const reviewController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Reviews loaded.', { reviews: await reviewService.list(req.user.id, req.validated.params.id) })),
  submit: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Review published.', { review: await reviewService.submit(req.user.id, req.validated.params.id, req.validated.body) })),
  publishShowcase: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Collaboration published to Showcase.', { showcase: await reviewService.publishShowcase(req.user.id, req.validated.params.id, req.validated.body) })),
};

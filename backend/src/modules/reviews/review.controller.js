import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { reviewService } from './review.service.js';
export const reviewController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Reviews loaded.', { reviews: await reviewService.list(req.user.id, req.validated.params.id) })),
  submit: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Review submitted.', { review: await reviewService.submit(req.user.id, req.validated.params.id, req.validated.body) })),
  giveShowcaseConsent: asyncHandler(async (req, res) => {
    const result = await reviewService.giveShowcaseConsent(req.user.id, req.validated.params.id, req.validated.body);
    const message = result.status === 'PUBLISHED'
      ? 'Both participants approved — collaboration published to Showcase.'
      : 'Showcase consent recorded. Waiting for the other participant to approve.';
    sendSuccess(res, result.status === 'PUBLISHED' ? 201 : 200, message, { showcase: result.post, status: result.status });
  }),
  declineShowcaseConsent: asyncHandler(async (req, res) => {
    const result = await reviewService.declineShowcaseConsent(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Showcase consent declined.', { status: result.status });
  }),
  proofs: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Publication proofs loaded.', { proofs: await reviewService.listProofs(req.user.id, req.validated.params.id) })),
  submitProof: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Publication proof submitted.', { proof: await reviewService.submitProof(req.user.id, req.validated.params.id, req.validated.body) })),
};

import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { deliverableService } from './deliverable.service.js';
export const deliverableController = {
  submit: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Deliverable submitted.', { deliverable: await deliverableService.submit(req.user.id, req.validated.params.id, req.validated.body) })),
  revise: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Deliverable revision submitted.', { deliverable: await deliverableService.submit(req.user.id, req.validated.params.id, req.validated.body, req.validated.params.deliverableId) })),
  review: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Deliverable review saved.', await deliverableService.review(req.user.id, req.validated.params.id, req.validated.params.deliverableId, req.validated.body))),
};

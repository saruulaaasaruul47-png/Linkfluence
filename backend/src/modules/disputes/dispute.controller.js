import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { disputeService } from './dispute.service.js';

export const disputeController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Disputes retrieved.', await disputeService.list(req.user.id, req.validated.params.collaborationId))),
  open: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Dispute opened and payment actions frozen.', { dispute: await disputeService.open(req.user.id, req.validated.params.collaborationId, req.validated.body) })),
  evidence: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Dispute evidence added.', { dispute: await disputeService.addEvidence(req.user.id, req.validated.params.id, req.validated.body) })),
};


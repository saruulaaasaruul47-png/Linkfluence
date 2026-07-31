import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { proposalService } from './proposal.service.js';

export const proposalController = {
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Proposal submitted.', { proposal: await proposalService.create(req.user.id, req.validated.params.campaignId, req.validated.body) });
  }),
  creatorList: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Creator proposals loaded.', await proposalService.listCreator(req.user.id, req.validated.query));
  }),
  businessList: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Business proposals loaded.', await proposalService.listBusiness(req.user.id, req.validated.query));
  }),
  get: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Proposal loaded.', { proposal: await proposalService.get(req.user.id, req.validated.params.id) });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Proposal updated.', { proposal: await proposalService.update(req.user.id, req.validated.params.id, req.validated.body) });
  }),
  withdraw: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Proposal withdrawn.', { proposal: await proposalService.withdraw(req.user.id, req.validated.params.id) });
  }),
  decide: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Proposal decision saved.', { proposal: await proposalService.decide(req.user.id, req.validated.params.id, req.validated.body) });
  }),
};

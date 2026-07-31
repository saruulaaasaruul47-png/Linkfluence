import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { offerService } from './offer.service.js';

export const offerController = {
  create: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Work offer sent.', { offer: await offerService.create(req.user.id, req.validated.body) })),
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Work offers loaded.', await offerService.list(req.user.id, req.validated.query))),
  get: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Work offer loaded.', { offer: await offerService.get(req.user.id, req.validated.params.id) })),
  creatorRespond: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Creator response saved.', { offer: await offerService.creatorRespond(req.user.id, req.validated.params.id, req.validated.body) })),
  businessDecide: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Business decision saved.', { offer: await offerService.businessDecide(req.user.id, req.validated.params.id, req.validated.body) })),
};

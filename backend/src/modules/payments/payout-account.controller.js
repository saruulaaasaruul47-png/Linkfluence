import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { payoutAccountService } from './payout-account.service.js';

export const payoutAccountController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Payout accounts loaded.', { accounts: await payoutAccountService.list(req.user.id) })),
  create: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Payout account saved.', { account: await payoutAccountService.create(req.user.id, req.validated.body) })),
  remove: asyncHandler(async (req, res) => { await payoutAccountService.remove(req.user.id, req.validated.params.id); sendSuccess(res, 200, 'Payout account removed.', null); }),
};

import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { paymentService } from './payment.service.js';
export const paymentController = {
  createFundingIntent: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Funding intent created.', await paymentService.createFundingIntent(req.user.id, req.validated.params.id, req.validated.body))),
  webhook: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Webhook processed.', { result: await paymentService.processWebhook(req.validated.body, req.get('x-payment-signature')) })),
  mockConfirm: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Mock provider event processed.', { payment: await paymentService.mockConfirm(req.user.id, req.validated.params.id) })),
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Transactions loaded.', await paymentService.list(req.user.id, req.validated.query))),
  methods: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Payment methods loaded.', { methods: await paymentService.listMethods(req.user.id) })),
  addMethod: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Payment method added.', { method: await paymentService.addMethod(req.user.id, req.validated.body) })),
  removeMethod: asyncHandler(async (req, res) => {
    await paymentService.removeMethod(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Payment method removed.', null);
  }),
  refund: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Refund requested.', { refund: await paymentService.requestRefund(req.user.id, req.validated.params.id, req.validated.body) })),
  payout: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Payout requested.', { payout: await paymentService.requestPayout(req.user.id, req.validated.params.id, req.validated.body) })),
};

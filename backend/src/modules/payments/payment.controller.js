import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { toCsv } from '../../shared/utils/csv.js';
import { paymentService } from './payment.service.js';
import { walletService } from './wallet.service.js';

const BOM = String.fromCharCode(0xfeff);

export const paymentController = {
  wallet: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Business wallet loaded.', await walletService.summary(req.user.id, req.validated.query.currency))),
  createTopUp: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Wallet top-up checkout created.', { topUp: await walletService.createTopUp(req.user.id, req.validated.body) })),
  reconcileTopUps: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Pending wallet top-ups reconciled.', await walletService.reconcilePendingTopUps(req.user.id))),
  collaborationPaymentSummary: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Collaboration payment summary loaded.', await walletService.collaborationSummary(req.user.id, req.validated.params.id))),
  fundFromWallet: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Collaboration funded from wallet.', await walletService.fundCollaboration(req.user.id, req.validated.params.id, req.validated.body))),
  createFundingIntent: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Funding intent created.', await paymentService.createFundingIntent(req.user.id, req.validated.params.id, req.validated.body))),
  webhook: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Webhook processed.', { result: await paymentService.processWebhook(req.validated.body, req.get('x-payment-signature')) })),
  qpayWebhook: asyncHandler(async (req, res) => sendSuccess(res, 200, 'QPay callback verified.', { result: await paymentService.processQPayCallback(req.validated.query.paymentId, req.validated.query.token, req.validated.body) })),
  stripeWebhook: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Stripe webhook verified.', { result: await paymentService.processStripeWebhook(req.body, req.get('stripe-signature')) })),
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
  earningsSummary: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Earnings summary loaded.', await paymentService.earningsSummary(req.user.id))),
  earningsExport: asyncHandler(async (req, res) => {
    const { year } = req.validated.query;
    const rows = await paymentService.earningsExport(req.user.id, year);
    const csv = toCsv(rows, [
      { label: 'Date', value: (row) => row.date.toISOString().slice(0, 10) },
      { label: 'Type', value: (row) => row.type },
      { label: 'Description', value: (row) => row.description },
      { label: 'Campaign', value: (row) => row.campaign },
      { label: 'Business', value: (row) => row.business },
      { label: 'Amount', value: (row) => row.amount.toFixed(2) },
      { label: 'Currency', value: (row) => row.currency },
    ]);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="earnings-${year || 'all'}.csv"`);
    res.set('Cache-Control', 'private, no-store');
    res.send(BOM + csv);
  }),
};

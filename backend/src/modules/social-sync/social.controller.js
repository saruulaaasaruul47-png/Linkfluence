import asyncHandler from 'express-async-handler';
import { env } from '../../config/env.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { socialService } from './social.service.js';
import { metaWebhookService } from './meta-webhook.service.js';

export const socialController = {
  verifyMetaWebhook: asyncHandler(async (req, res) => {
    res.status(200).type('text/plain').send(metaWebhookService.verify(req.query));
  }),

  receiveMetaWebhook: asyncHandler(async (req, res) => {
    const result = await metaWebhookService.receive(req.body, req.get('x-hub-signature-256'));
    sendSuccess(res, 200, 'Meta webhook received.', result);
  }),
  authorize: asyncHandler(async (req, res) => {
    const data = await socialService.authorize(
      req.user.id,
      req.validated.params.provider,
      req.validated.query.redirectTo,
      req.validated.query.channelType,
    );
    sendSuccess(res, 200, 'Social authorization started.', data);
  }),

  callback: asyncHandler(async (req, res) => {
    const data = await socialService.callback(
      req.validated.params.provider,
      req.validated.query,
    );
    const acceptsHtml = (req.get('accept') || '').includes('text/html');
    if (acceptsHtml) {
      const redirect = new URL(data.redirectTo || '/account?channel=creator', env.clientUrl);
      redirect.searchParams.set('social', data.selectionRequired ? 'select' : 'connected');
      if (data.selectionRequired) redirect.searchParams.set('selectionToken', data.selectionToken);
      else redirect.searchParams.set('platform', data.account.platform.toLowerCase());
      res.redirect(303, redirect.toString());
      return;
    }
    sendSuccess(res, 200, data.idempotent ? 'Social connection already completed.' : 'Social account connected.', data);
  }),

  list: asyncHandler(async (req, res) => {
    const accounts = await socialService.list(req.user.id, req.validated?.query?.channelType || 'CREATOR');
    sendSuccess(res, 200, 'Social accounts retrieved.', { accounts });
  }),

  createManual: asyncHandler(async (req, res) => {
    const account = await socialService.createManual(req.user.id, req.validated.body, req.validated?.query?.channelType || 'CREATOR');
    sendSuccess(res, 201, 'Manual social account added as unverified.', { account });
  }),

  updateManual: asyncHandler(async (req, res) => {
    const account = await socialService.updateManual(
      req.user.id,
      req.validated.params.id,
      req.validated.body,
      req.validated?.query?.channelType || 'CREATOR',
    );
    sendSuccess(res, 200, 'Manual social account updated.', { account });
  }),

  disconnect: asyncHandler(async (req, res) => {
    await socialService.disconnect(req.user.id, req.validated.params.id, req.validated?.query?.channelType || 'CREATOR');
    sendSuccess(res, 200, 'Social account disconnected.');
  }),

  selectionOptions: asyncHandler(async (req, res) => {
    const data = await socialService.selectionOptions(req.user.id, req.validated.query.selectionToken);
    sendSuccess(res, 200, 'Authorized social accounts retrieved.', data);
  }),

  completeSelection: asyncHandler(async (req, res) => {
    const data = await socialService.selectAccount(
      req.user.id,
      req.validated.body.selectionToken,
      req.validated.body.externalAccountId,
    );
    sendSuccess(res, 200, 'Social account connected.', data);
  }),

  sync: asyncHandler(async (req, res) => {
    const account = await socialService.sync(req.user, req.validated.params.id);
    sendSuccess(res, 200, 'Social statistics synchronized.', { account });
  }),
};

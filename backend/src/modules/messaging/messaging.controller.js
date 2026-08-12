import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { messagingService } from './messaging.service.js';

export const messagingController = {
  createRequest: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Message request saved.', await messagingService.createRequest(req.user.id, req.validated.body))),
  requests: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Message requests retrieved.', await messagingService.requests(req.user.id, req.validated.query))),
  decideRequest: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Message request decision saved.', { request: await messagingService.decideRequest(req.user.id, req.validated.params.id, req.validated.body.action) })),
  create: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Conversation ready.', { conversation: await messagingService.create(req.user.id, req.validated.body.collaborationId) })),
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Conversations retrieved.', await messagingService.list(req.user.id, req.validated.query))),
  messages: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Messages retrieved.', await messagingService.messages(req.user.id, req.validated.params.id, req.validated.query))),
  send: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Message sent.', { message: await messagingService.send(req.user.id, req.validated.params.id, req.validated.body) })),
  edit: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Message updated.', { message: await messagingService.edit(req.user.id, req.validated.params.id, req.validated.params.messageId, req.validated.body.body) })),
  remove: asyncHandler(async (req, res) => { await messagingService.remove(req.user.id, req.validated.params.id, req.validated.params.messageId); sendSuccess(res, 200, 'Message deleted.'); }),
  read: asyncHandler(async (req, res) => { await messagingService.read(req.user.id, req.validated.params.id); sendSuccess(res, 200, 'Conversation marked read.'); }),
};

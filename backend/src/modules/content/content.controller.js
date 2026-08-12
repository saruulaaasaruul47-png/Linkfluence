import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { contentService } from './content.service.js';

export const contentController = {
  feed: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content feed loaded.', await contentService.feed(req.validated.query, req.user))),
  get: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content post loaded.', { post: await contentService.get(req.validated.params.id, req.user?.id) })),
  channel: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel posts loaded.', await contentService.channel(req.validated.params.authorType, req.validated.params.id, req.validated.query, req.user?.id))),
  mine: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel content loaded.', await contentService.mine(req.user.id, req.validated.query))),
  create: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Content post created.', { post: await contentService.create(req.user.id, req.validated.body) })),
  update: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content post updated.', { post: await contentService.update(req.user.id, req.validated.params.id, req.validated.body) })),
  publish: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content post published.', { post: await contentService.publish(req.user.id, req.validated.params.id) })),
  archive: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content post archived.', { post: await contentService.archive(req.user.id, req.validated.params.id) })),
  remove: asyncHandler(async (req, res) => { await contentService.remove(req.user.id, req.validated.params.id); sendSuccess(res, 200, 'Content post removed.', null); }),
  like: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content liked.', { post: await contentService.like(req.user.id, req.validated.params.id) })),
  unlike: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content like removed.', { post: await contentService.unlike(req.user.id, req.validated.params.id) })),
};

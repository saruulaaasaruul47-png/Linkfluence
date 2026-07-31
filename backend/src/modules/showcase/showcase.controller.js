import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { showcaseService } from './showcase.service.js';

export const showcaseController = {
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Showcase loaded.', await showcaseService.list(req.validated.query));
  }),
  following: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Following showcase loaded.', await showcaseService.list(req.validated.query, req.user.id));
  }),
  get: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Showcase post loaded.', { post: await showcaseService.get(req.validated.params.id, req.user?.id) });
  }),
  mine: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Creator showcase loaded.', { items: await showcaseService.mine(req.user.id) });
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Showcase post created.', { post: await showcaseService.create(req.user.id, req.validated.body) });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Showcase post updated.', { post: await showcaseService.update(req.user.id, req.validated.params.id, req.validated.body) });
  }),
  remove: asyncHandler(async (req, res) => {
    await showcaseService.remove(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Showcase post archived.', null);
  }),
  like: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Showcase reaction saved.', { post: await showcaseService.like(req.user.id, req.validated.params.id) });
  }),
  unlike: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Showcase reaction removed.', { post: await showcaseService.unlike(req.user.id, req.validated.params.id) });
  }),
};

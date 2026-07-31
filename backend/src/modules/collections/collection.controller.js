import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { collectionService } from './collection.service.js';

export const collectionController = {
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Collections loaded.', { collections: await collectionService.list(req.user.id) });
  }),
  get: asyncHandler(async (req, res) => {
    const collection = await collectionService.get(
      req.user?.id || null,
      req.validated.params.id,
      req.validated.query.token,
    );
    sendSuccess(res, 200, 'Collection loaded.', { collection });
  }),
  create: asyncHandler(async (req, res) => {
    const collection = await collectionService.create(req.user.id, req.validated.body);
    sendSuccess(res, 201, 'Collection created.', { collection });
  }),
  update: asyncHandler(async (req, res) => {
    const collection = await collectionService.update(
      req.user.id,
      req.validated.params.id,
      req.validated.body,
    );
    sendSuccess(res, 200, 'Collection updated.', { collection });
  }),
  remove: asyncHandler(async (req, res) => {
    await collectionService.remove(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Collection deleted.', null);
  }),
  addItem: asyncHandler(async (req, res) => {
    const { id, targetType, targetId } = req.validated.params;
    const collection = await collectionService.addItem(
      req.user.id,
      id,
      targetType,
      targetId,
      req.validated.body.note,
    );
    sendSuccess(res, 200, 'Item added to collection.', { collection });
  }),
  removeItem: asyncHandler(async (req, res) => {
    const { id, targetType, targetId } = req.validated.params;
    const collection = await collectionService.removeItem(
      req.user.id,
      id,
      targetType,
      targetId,
    );
    sendSuccess(res, 200, 'Item removed from collection.', { collection });
  }),
};

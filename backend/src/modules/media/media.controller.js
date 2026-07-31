import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { mediaService } from './media.service.js';

export const mediaController = {
  upload: asyncHandler(async (req, res) => {
    const asset = await mediaService.upload(
      req.user.id,
      req.validated.body.purpose,
      req.file,
    );
    sendSuccess(res, 201, 'Media uploaded successfully.', { asset });
  }),

  remove: asyncHandler(async (req, res) => {
    await mediaService.remove(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Media deleted successfully.', null);
  }),
};

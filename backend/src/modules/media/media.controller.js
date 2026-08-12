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
  content: asyncHandler(async (req, res) => {
    const asset = await mediaService.delivery(req.validated.params.id, req.user?.id);
    res.type(asset.mimeType);
    res.set('Cache-Control', req.user ? 'private, max-age=300' : 'public, max-age=86400');
    res.set('Content-Disposition', `inline; filename="${asset.originalName.replaceAll('"', '')}"`);
    res.sendFile(asset.path);
  }),
  signedDownload: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Signed download URL created.', await mediaService.signedDownload(req.user.id, req.validated.params.id))),
  signedUploadUrl: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Signed upload URL created.', mediaService.signedUpload(req.user.id, req.validated.body.purpose))),
  signedUpload: asyncHandler(async (req, res) => {
    const { ownerId } = req.validated.params;
    const { purpose, expires, signature } = req.validated.query;
    const asset = await mediaService.uploadSigned(ownerId, purpose, expires, signature, req.file);
    sendSuccess(res, 201, 'Media uploaded successfully.', { asset });
  }),
  signedContent: asyncHandler(async (req, res) => {
    const { subject, expires, signature } = req.validated.query;
    const asset = await mediaService.signedDelivery(req.validated.params.id, subject, expires, signature);
    res.type(asset.mimeType);
    res.set('Cache-Control', 'private, max-age=300');
    res.set('Content-Disposition', `inline; filename="${asset.originalName.replaceAll('"', '')}"`);
    res.sendFile(asset.path);
  }),
};

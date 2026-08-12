import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/public.js';
import { mediaController } from './media.controller.js';
import { mediaIdSchema, signedContentSchema, signedUploadSchema, signedUrlSchema, uploadMediaSchema } from './media.schema.js';
import { mediaUpload } from './media.upload.js';

export const mediaRouter = Router();

mediaRouter.get('/assets/:id/content', optionalAuthenticate, validate(mediaIdSchema), mediaController.content);
mediaRouter.get('/assets/:id/signed-content', validate(signedContentSchema), mediaController.signedContent);
mediaRouter.post('/signed-uploads/:ownerId', mediaUpload.single('file'), validate(signedUploadSchema), mediaController.signedUpload);
mediaRouter.use(authenticate);
mediaRouter.post('/uploads/signed-url', validate(signedUrlSchema), mediaController.signedUploadUrl);
mediaRouter.post('/assets/:id/signed-download', validate(mediaIdSchema), mediaController.signedDownload);
mediaRouter.post('/uploads', mediaUpload.single('file'), validate(uploadMediaSchema), mediaController.upload);
mediaRouter.delete('/uploads/:id', validate(mediaIdSchema), mediaController.remove);

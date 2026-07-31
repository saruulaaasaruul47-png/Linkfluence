import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { mediaController } from './media.controller.js';
import { mediaIdSchema, uploadMediaSchema } from './media.schema.js';
import { mediaUpload } from './media.upload.js';

export const mediaRouter = Router();

mediaRouter.use(authenticate);
mediaRouter.post('/uploads', mediaUpload.single('file'), validate(uploadMediaSchema), mediaController.upload);
mediaRouter.delete('/uploads/:id', validate(mediaIdSchema), mediaController.remove);

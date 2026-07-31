import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.mediaMaxVideoBytes,
    fields: 4,
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(
        'Upload a JPG, PNG, GIF, WEBP, MP4, MOV, or WEBM file.',
        400,
        'UNSUPPORTED_MEDIA_TYPE',
      ));
      return;
    }
    callback(null, true);
  },
});

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { AppError } from '../errors/AppError.js';

export const avatarDirectory = path.resolve(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(avatarDirectory, { recursive: true });

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const storage = multer.diskStorage({
  destination: avatarDirectory,
  filename(_req, file, callback) {
    const extension = allowedTypes.get(file.mimetype);
    callback(null, `${randomUUID()}${extension}`);
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new AppError('Upload a JPG, PNG, WEBP or GIF image.', 400, 'INVALID_AVATAR_FILE'));
      return;
    }
    callback(null, true);
  },
});

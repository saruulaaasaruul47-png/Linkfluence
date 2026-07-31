import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { AUTH_ERROR } from '../constants/auth.constants.js';
import { AppError } from './AppError.js';

function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('The uploaded file is too large.', 400, 'UPLOAD_TOO_LARGE');
    }
    return new AppError('The upload could not be processed.', 400, 'UPLOAD_FAILED');
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : error.meta?.target;
      const isUsername = /username|slug/i.test(String(target || ''));
      return new AppError(
        isUsername ? 'This username is already in use.' : 'This email is already registered.',
        409,
        isUsername ? AUTH_ERROR.USERNAME_EXISTS : AUTH_ERROR.EMAIL_EXISTS,
      );
    }
    if (error.code === 'P2025') {
      return new AppError('The requested resource was not found.', 404, AUTH_ERROR.USER_NOT_FOUND);
    }
    return new AppError('A database operation failed.', 500, AUTH_ERROR.DATABASE);
  }

  if (error?.name === 'TokenExpiredError') {
    return new AppError('The token has expired.', 401, AUTH_ERROR.TOKEN_EXPIRED);
  }
  if (error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError') {
    return new AppError('The token is invalid.', 401, AUTH_ERROR.INVALID_TOKEN);
  }

  return new AppError('An unexpected error occurred.', 500, AUTH_ERROR.INTERNAL);
}

export function errorHandler(error, _req, res, _next) {
  const normalized = normalizeError(error);

  if (!normalized.isOperational || normalized.statusCode >= 500) {
    console.error({
      name: error?.name,
      code: normalized.code,
      message: error?.message,
      stack: env.nodeEnv === 'development' ? error?.stack : undefined,
    });
  }

  const payload = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details ?? null,
    },
  };

  if (env.nodeEnv === 'development' && normalized.statusCode >= 500) {
    payload.error.stack = error?.stack;
  }

  res.status(normalized.statusCode).json(payload);
}

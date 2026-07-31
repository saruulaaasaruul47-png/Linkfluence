import { AppError } from './AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, 404, 'NOT_FOUND'));
}

import { AUTH_ERROR } from '../constants/auth.constants.js';
import { AppError } from '../errors/AppError.js';

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError('Authentication is required.', 401, AUTH_ERROR.UNAUTHORIZED));
      return;
    }

    if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
      next(new AppError('You do not have permission to perform this action.', 403, AUTH_ERROR.FORBIDDEN));
      return;
    }

    next();
  };
}

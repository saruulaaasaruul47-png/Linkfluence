import { AUTH_ERROR } from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authService } from './auth.service.js';

export async function authenticate(req, _res, next) {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      throw new AppError('Authentication is required.', 401, AUTH_ERROR.UNAUTHORIZED);
    }
    req.user = await authService.authenticateAccessToken(match[1]);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(req, _res, next) {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      req.user = null;
      next();
      return;
    }
    req.user = await authService.authenticateAccessToken(match[1]);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireReauthentication(req, _res, next) {
  try {
    const token = req.get('x-reauth-token');
    if (!token) throw new AppError('Recent password confirmation is required.', 401, 'REAUTHENTICATION_REQUIRED');
    authService.verifyReauthentication(token, req.user);
    next();
  } catch (error) {
    next(error);
  }
}

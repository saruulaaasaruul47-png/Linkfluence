import {
  ACTIVE_STATUS,
  AUTH_ERROR,
  PENDING_STATUS,
} from '../../shared/constants/auth.constants.js';
import { AppError } from '../../shared/errors/AppError.js';

export function assertActiveUser(user) {
  if (!user || user.deletedAt || user.status === 'SUSPENDED' || user.status === 'BANNED') {
    throw new AppError('This account is not available.', 403, AUTH_ERROR.ACCOUNT_DISABLED);
  }
  if (!user.emailVerifiedAt || user.status === PENDING_STATUS) {
    throw new AppError(
      'Please verify your email before signing in.',
      403,
      AUTH_ERROR.EMAIL_NOT_VERIFIED,
      { verificationRequired: true },
    );
  }
  if (user.status !== ACTIVE_STATUS) {
    throw new AppError('This account is not available.', 403, AUTH_ERROR.ACCOUNT_DISABLED);
  }
}

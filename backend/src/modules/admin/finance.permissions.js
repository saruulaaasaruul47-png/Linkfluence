import { AppError } from '../../shared/errors/AppError.js';

export const FINANCE_PERMISSIONS = Object.freeze({
  VIEW_FINANCE: 'VIEW_FINANCE',
  VIEW_TRANSACTIONS: 'VIEW_TRANSACTIONS',
  MANAGE_PAYOUTS: 'MANAGE_PAYOUTS',
  MANAGE_REFUNDS: 'MANAGE_REFUNDS',
});

const rolePermissions = Object.freeze({
  ADMIN: new Set(Object.values(FINANCE_PERMISSIONS)),
});

export function hasFinancePermission(user, permission) {
  if (!user) return false;
  const explicit = Array.isArray(user.permissions) ? user.permissions : [];
  if (explicit.includes(permission)) return true;
  return (user.roles || []).some((role) => rolePermissions[role]?.has(permission));
}

export function requireFinancePermission(permission) {
  return (req, _res, next) => {
    if (!hasFinancePermission(req.user, permission)) {
      next(new AppError('You do not have permission to perform this finance action.', 403, 'FINANCE_PERMISSION_REQUIRED', { permission }));
      return;
    }
    next();
  };
}

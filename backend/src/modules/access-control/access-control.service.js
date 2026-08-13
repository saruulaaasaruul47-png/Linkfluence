import { AppError } from '../../shared/errors/AppError.js';
import { accessControlRepository } from './access-control.repository.js';

const notFound = (message) => new AppError(message, 404, 'NOT_FOUND');

async function requireUserAndPermission(userId, key, db) {
  const [user, permission] = await Promise.all([
    accessControlRepository.findUser(userId, db),
    accessControlRepository.findPermission(key, db),
  ]);
  if (!user || user.status === 'DELETED') throw notFound('User was not found.');
  if (!permission) throw notFound('Permission was not found.');
  return { permission };
}

export const accessControlService = {
  listPermissions() {
    return accessControlRepository.listPermissions();
  },
  async listUserPermissions(userId) {
    const user = await accessControlRepository.findUser(userId);
    if (!user || user.status === 'DELETED') throw notFound('User was not found.');
    const grants = await accessControlRepository.listUserPermissions(userId);
    return { user, grants };
  },
  grant(userId, permissionKey, actor, context = {}) {
    return accessControlRepository.transaction(async (tx) => {
      const { permission } = await requireUserAndPermission(userId, permissionKey, tx);
      const grant = await accessControlRepository.grant({
        userId,
        permissionId: permission.id,
        grantedById: actor.id,
      }, tx);
      await accessControlRepository.recordAudit({
        actorId: actor.id,
        action: 'PERMISSION_GRANTED',
        targetType: 'USER_PERMISSION',
        targetId: grant.id,
        reason: context.reason,
        after: { userId, permission: permission.key },
        ipAddress: context.ipAddress,
      }, tx);
      return grant;
    });
  },
  revoke(userId, permissionKey, actor, context = {}) {
    return accessControlRepository.transaction(async (tx) => {
      const { permission } = await requireUserAndPermission(userId, permissionKey, tx);
      const result = await accessControlRepository.revoke(userId, permission.id, tx);
      if (!result.count) throw notFound('Permission grant was not found.');
      await accessControlRepository.recordAudit({
        actorId: actor.id,
        action: 'PERMISSION_REVOKED',
        targetType: 'USER_PERMISSION',
        targetId: `${userId}:${permission.id}`,
        reason: context.reason,
        before: { userId, permission: permission.key },
        ipAddress: context.ipAddress,
      }, tx);
      return null;
    });
  },
};

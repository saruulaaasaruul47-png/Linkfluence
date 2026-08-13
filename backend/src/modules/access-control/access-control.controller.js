import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { accessControlService } from './access-control.service.js';

const context = (req) => ({ reason: req.validated.body.reason, ipAddress: req.ip });

export const accessControlController = {
  listPermissions: asyncHandler(async (_req, res) => {
    const permissions = await accessControlService.listPermissions();
    sendSuccess(res, 200, 'Permissions retrieved successfully.', { permissions });
  }),
  listUserPermissions: asyncHandler(async (req, res) => {
    const result = await accessControlService.listUserPermissions(req.validated.params.userId);
    sendSuccess(res, 200, 'User permissions retrieved successfully.', result);
  }),
  grant: asyncHandler(async (req, res) => {
    const grant = await accessControlService.grant(
      req.validated.params.userId,
      req.validated.params.permissionKey,
      req.user,
      context(req),
    );
    sendSuccess(res, 200, 'Permission granted successfully.', { grant });
  }),
  revoke: asyncHandler(async (req, res) => {
    await accessControlService.revoke(
      req.validated.params.userId,
      req.validated.params.permissionKey,
      req.user,
      context(req),
    );
    sendSuccess(res, 200, 'Permission revoked successfully.', null);
  }),
};

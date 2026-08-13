import { Router } from 'express';
import { authenticate } from '../auth/public.js';
import { requireReauthentication } from '../auth/auth.middleware.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { accessControlController } from './access-control.controller.js';
import { permissionMutationSchema, userPermissionListSchema } from './access-control.schema.js';

export const accessControlRouter = Router();
accessControlRouter.use(authenticate, authorize('ADMIN'));
accessControlRouter.get('/permissions', accessControlController.listPermissions);
accessControlRouter.get('/users/:userId/permissions', validate(userPermissionListSchema), accessControlController.listUserPermissions);
accessControlRouter.put('/users/:userId/permissions/:permissionKey', requireReauthentication, validate(permissionMutationSchema), accessControlController.grant);
accessControlRouter.delete('/users/:userId/permissions/:permissionKey', requireReauthentication, validate(permissionMutationSchema), accessControlController.revoke);

import { Router } from 'express';
import { avatarUpload } from '../../shared/middleware/avatarUpload.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { userController } from './user.controller.js';
import { changePasswordSchema, updateUserSchema } from './user.schema.js';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/me', userController.getMe);
userRouter.patch('/me', validate(updateUserSchema), userController.updateMe);
userRouter.patch('/me/avatar', avatarUpload.single('avatar'), userController.updateAvatar);
userRouter.patch('/me/password', validate(changePasswordSchema), userController.changePassword);
userRouter.delete('/me', userController.deleteMe);

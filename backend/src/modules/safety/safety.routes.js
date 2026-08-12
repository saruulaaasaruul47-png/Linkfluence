import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { safetyController } from './safety.controller.js';
import { reportSchema, safetyStateSchema, safetyTargetSchema } from './safety.schema.js';

export const safetyRouter = Router();
safetyRouter.get('/safety', authenticate, validate(safetyStateSchema), safetyController.state);
safetyRouter.put('/safety/blocks/:targetType/:targetId', authenticate, validate(safetyTargetSchema), safetyController.block);
safetyRouter.delete('/safety/blocks/:targetType/:targetId', authenticate, validate(safetyTargetSchema), safetyController.unblock);
safetyRouter.put('/safety/mutes/:targetType/:targetId', authenticate, validate(safetyTargetSchema), safetyController.mute);
safetyRouter.delete('/safety/mutes/:targetType/:targetId', authenticate, validate(safetyTargetSchema), safetyController.unmute);
safetyRouter.post('/reports', authenticate, validate(reportSchema), safetyController.report);

import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { discoveryController } from './discovery.controller.js';
import { discoverSchema, searchSchema } from './discovery.schema.js';

export const discoveryRouter = Router();
discoveryRouter.get('/discover', validate(discoverSchema), discoveryController.discover);

export const searchRouter = Router();
searchRouter.get('/', validate(searchSchema), discoveryController.search);

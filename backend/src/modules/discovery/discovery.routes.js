import { Router } from 'express';
import { optionalAuthenticate } from '../auth/public.js';
import { validate } from '../../shared/middleware/validate.js';
import { discoveryController } from './discovery.controller.js';
import { discoverSchema, searchSchema } from './discovery.schema.js';

export const discoveryRouter = Router();
discoveryRouter.get('/discover', optionalAuthenticate, validate(discoverSchema), discoveryController.discover);

export const searchRouter = Router();
searchRouter.get('/', optionalAuthenticate, validate(searchSchema), discoveryController.search);

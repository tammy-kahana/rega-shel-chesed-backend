// כל נקודות הקצה של ה-API, תחת /api
import { Router } from 'express';
import * as systemController from '../controllers/system.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authRouter } from './auth.routes';
import { taskRouter } from './task.routes';
import { volunteerRouter } from './volunteer.routes';

export const apiRouter = Router();

apiRouter.get('/health', asyncHandler(systemController.health));
apiRouter.get('/meta', systemController.meta);
apiRouter.use('/auth', authRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/volunteers', volunteerRouter);

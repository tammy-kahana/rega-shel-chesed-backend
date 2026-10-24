import { Router } from 'express';
import * as volunteerController from '../controllers/volunteer.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../schemas/common.schema';
import { volunteerListQuerySchema, volunteerStatusSchema } from '../schemas/volunteer.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const volunteerRouter = Router();

// ניהול מתנדבים - רכזים בלבד
volunteerRouter.use(authenticate, requireRole('COORDINATOR'));

const withId = validate(idParamSchema, 'params');

volunteerRouter.get('/', validate(volunteerListQuerySchema, 'query'), asyncHandler(volunteerController.list));
volunteerRouter.patch('/:id/status', withId, validate(volunteerStatusSchema), asyncHandler(volunteerController.setStatus));
volunteerRouter.patch('/:id/promote', withId, asyncHandler(volunteerController.promote));

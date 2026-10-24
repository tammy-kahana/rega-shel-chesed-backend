import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../schemas/common.schema';
import { taskBodySchema, taskListQuerySchema } from '../schemas/task.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const taskRouter = Router();

// כל כתובות המשימות דורשות התחברות
taskRouter.use(authenticate);

const withId = validate(idParamSchema, 'params');
const coordinatorOnly = requireRole('COORDINATOR');

taskRouter.get('/', validate(taskListQuerySchema, 'query'), asyncHandler(taskController.list));
taskRouter.get('/:id', withId, asyncHandler(taskController.getOne));

// רכזים בלבד
taskRouter.post('/', coordinatorOnly, validate(taskBodySchema), asyncHandler(taskController.create));
taskRouter.put('/:id', coordinatorOnly, withId, validate(taskBodySchema), asyncHandler(taskController.update));
taskRouter.patch('/:id/complete', coordinatorOnly, withId, asyncHandler(taskController.complete));

// מתנדבים מאושרים ורכזים (הבדיקה בתוך השירות)
taskRouter.post('/:id/join', withId, asyncHandler(taskController.join));
taskRouter.post('/:id/cancel', withId, asyncHandler(taskController.cancel));
taskRouter.post('/:id/report-done', withId, asyncHandler(taskController.reportDone));

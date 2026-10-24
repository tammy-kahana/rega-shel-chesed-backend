// Routes: מגדירים איזו כתובת מפעילה איזה Controller, ואילו בדיקות עוברות לפני כן.
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));
authRouter.get('/me', authenticate, asyncHandler(authController.me));

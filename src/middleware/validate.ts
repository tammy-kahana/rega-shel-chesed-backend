// Middleware לבדיקת תקינות של הנתונים שנשלחו (גוף הבקשה / פרמטרים בכתובת).
// אם הנתונים לא תקינים - מוחזרת שגיאה 400 עם פירוט לפי שדה.
import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      next(zodToAppError(result.error));
      return;
    }
    // שומרים את הערכים אחרי הניקוי (למשל טלפון בלי מקפים)
    req[source] = result.data;
    next();
  };
}

export function zodToAppError(error: ZodError): AppError {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return AppError.badRequest('הנתונים שנשלחו אינם תקינים', details);
}

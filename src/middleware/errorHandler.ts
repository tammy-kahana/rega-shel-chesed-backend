// טיפול מרוכז בשגיאות: כל שגיאה במערכת מגיעה לכאן והופכת לתשובת JSON אחידה:
// { "message": "הודעה בעברית", "details": [ { "field": "...", "message": "..." } ] }
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`הכתובת ${req.method} ${req.originalUrl} לא קיימת`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  // גוף בקשה שאינו JSON תקין
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'גוף הבקשה אינו JSON תקין' });
    return;
  }

  // ערך ייחודי שכבר קיים במסד הנתונים
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ message: 'הערך כבר קיים במערכת' });
    return;
  }

  console.error('שגיאה לא צפויה:', err);
  res.status(500).json({ message: 'אירעה שגיאה בשרת. נסו שוב מאוחר יותר' });
};

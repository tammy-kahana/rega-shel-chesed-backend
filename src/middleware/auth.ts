// אימות (Authentication) והרשאות (Authorization).
//
// authenticate: קורא את ה-Token מהכותרת Authorization: Bearer <token>,
//   בודק אותו, וטוען את המשתמש העדכני ממסד הנתונים.
//   כך שינוי (אישור, חסימה, קידום לרכז/ת) נכנס לתוקף מיד, גם בלי התחברות מחדש.
// requireRole: מאפשר להמשיך רק לתפקיד מסוים (למשל רכז/ת).
import type { Request, RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { verifyToken } from '../services/token.service';
import { publicUserSelect, type PublicUser } from '../services/user.mapper';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('נדרשת התחברות. יש לשלוח Token בכותרת Authorization');
  }

  const userId = verifyToken(header.slice('Bearer '.length).trim());

  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw AppError.unauthorized('המשתמש לא נמצא. יש להתחבר מחדש');
  }

  req.user = user;
  next();
});

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      next(AppError.forbidden(role === 'COORDINATOR' ? 'פעולה זו מותרת לרכזים בלבד' : 'אין לך הרשאה לבצע פעולה זו'));
      return;
    }
    next();
  };
}

/** מחזיר את המשתמש המחובר. משמש ב-Controllers שאחרי authenticate */
export function currentUser(req: Request): PublicUser {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}

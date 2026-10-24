// יצירה ובדיקה של JWT.
// ה-Token מכיל רק את מזהה המשתמש (sub). התפקיד והסטטוס נטענים ממסד הנתונים בכל בקשה.
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export function createToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** מחזיר את מזהה המשתמש, או זורק 401 אם ה-Token לא תקין או שפג תוקפו */
export function verifyToken(token: string): number {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = typeof payload === 'object' ? Number(payload.sub) : Number.NaN;
    if (!Number.isInteger(userId) || userId <= 0) {
      throw AppError.unauthorized('Token לא תקין');
    }
    return userId;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('פג תוקף ההתחברות. יש להתחבר מחדש');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.unauthorized('Token לא תקין');
  }
}

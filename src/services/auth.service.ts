// לוגיקת הרשמה והתחברות
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { AppError } from '../utils/AppError';
import { createToken } from './token.service';
import { publicUserSelect, toUserResponse } from './user.mapper';

/** הרשמת מתנדב חדש. מתנדב חדש תמיד מתחיל בסטטוס "ממתין לאישור" */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
  if (existing) {
    throw AppError.conflict('מספר הטלפון כבר רשום במערכת');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      passwordHash,
      role: 'VOLUNTEER',
      status: 'PENDING',
    },
    select: publicUserSelect,
  });

  return { token: createToken(user.id), user: toUserResponse(user) };
}

/** התחברות לפי טלפון וסיסמה */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  // אותה הודעה בשני המקרים, כדי לא לחשוף אילו מספרי טלפון רשומים
  if (!user || !passwordOk) {
    throw AppError.unauthorized('מספר טלפון או סיסמה שגויים');
  }

  return { token: createToken(user.id), user: toUserResponse(user) };
}

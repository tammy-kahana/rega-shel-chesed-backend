// ולידציה לטפסי ההרשמה וההתחברות
import { z } from 'zod';
import { phoneSchema, text } from './common.schema';

export const registerSchema = z.object({
  fullName: text('יש להזין שם מלא', 'השם חייב להיות טקסט')
    .trim()
    .min(2, 'השם המלא חייב להכיל לפחות 2 תווים')
    .max(60, 'השם המלא יכול להכיל עד 60 תווים'),
  phone: phoneSchema,
  password: text('יש להזין סיסמה', 'הסיסמה חייבת להיות טקסט')
    .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
    .max(72, 'הסיסמה יכולה להכיל עד 72 תווים')
    .regex(/[A-Za-z]/, 'הסיסמה חייבת להכיל לפחות אות אחת באנגלית')
    .regex(/\d/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: text('יש להזין סיסמה', 'הסיסמה חייבת להיות טקסט').min(1, 'יש להזין סיסמה'),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;

// טעינה ובדיקה של משתני הסביבה.
// אם חסר משתנה חובה - השרת לא עולה, ומודפסת הודעה ברורה מה חסר.
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'חסר DATABASE_URL - כתובת החיבור למסד הנתונים'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET חייב להכיל לפחות 32 תווים'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  // רשימת כתובות מופרדות בפסיק, או * כדי לאפשר לכולם
  CORS_ORIGIN: z.string().default('*'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ שגיאה במשתני הסביבה:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('בדקי את קובץ .env (מקומית) או את Environment Variables (בענן).');
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins: string[] | '*' =
  env.CORS_ORIGIN.trim() === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);

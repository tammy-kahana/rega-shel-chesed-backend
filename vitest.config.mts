import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// הבדיקות רצות מול מסד נתונים נפרד (TEST_DATABASE_URL), שנמחק ונבנה מחדש בכל הרצה.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? '';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/global-setup.ts'],
    // כל קובצי הבדיקה משתמשים באותו מסד נתונים, ולכן רצים אחד אחרי השני
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-for-automated-tests-only-0123456789',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_ROUNDS: '4',
      CORS_ORIGIN: '*',
    },
  },
});

// לפני כל הבדיקות: בונה מחדש את מסד הנתונים של הבדיקות מקובצי ה-Migrations.
// ⚠️ מוחק את כל התוכן של TEST_DATABASE_URL - לעולם לא להפנות אותו למסד הנתונים האמיתי!
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('חסר TEST_DATABASE_URL בקובץ .env - כתובת של מסד נתונים נפרד לבדיקות');
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL חייב להיות שונה מ-DATABASE_URL, כי הבדיקות מוחקות את כל הנתונים');
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    const migrationsDir = join(__dirname, '..', '..', 'prisma', 'migrations');
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of migrations) {
      await client.query(readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }
}

// נקודת הכניסה: מפעיל את השרת על הפורט שהוגדר (בענן - הפורט שהשירות מספק)
import { app } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`✅ השרת פועל על פורט ${env.PORT}`);
  console.log(`   תיעוד API: http://localhost:${env.PORT}/api-docs`);
});

// סגירה מסודרת כשהשרת נעצר
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// נתוני הדגמה: רכזים, מתנדבים, משימות והצטרפויות - נתונים מומצאים שנראים אמיתיים.
//
// הפעלה:
//   npm run db:seed            ממלא רק אם מסד הנתונים ריק
//   npm run db:seed -- --reset מוחק הכול וממלא מחדש (זהירות!)
//
// כל משתמשי ההדגמה מקבלים את הסיסמה מהמשתנה SEED_DEMO_PASSWORD.
// בסביבת פיתוח, אם המשתנה לא הוגדר, הסיסמה היא Hesed2026.
// בסביבת Production חייבים להגדיר אותו, אחרת נתוני ההדגמה לא נוצרים.
import bcrypt from 'bcryptjs';
import type { Area, Prisma, TaskStatus, TaskType, UserStatus } from '@prisma/client';
import { env } from '../src/config/env';
import { prisma } from '../src/db/prisma';
import { addDays, dateStringToDate, todayInIsrael } from '../src/utils/dates';

// ---------- מחולל אקראי קבוע (אותם נתונים בכל הרצה) ----------

let randomState = 2026;
function random(): number {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];
const chance = (probability: number) => random() < probability;
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- חומרי גלם ----------

const MALE_NAMES = ['יוסף', 'משה', 'אברהם', 'יעקב', 'דוד', 'שמואל', 'אליהו', 'חיים', 'מרדכי', 'אהרן', 'יצחק', 'שלמה', 'מנחם', 'ישראל', 'נחום', 'ברוך', 'צבי', 'אריה'];
const FEMALE_NAMES = ['רחל', 'שרה', 'לאה', 'רבקה', 'מרים', 'חנה', 'אסתר', 'דבורה', 'יהודית', 'נחמה', 'שושנה', 'בתיה', 'טובה', 'פנינה', 'גיטי', 'חיה'];
const LAST_NAMES = ['כהן', 'לוי', 'פרידמן', 'גולדשטיין', 'רוזנברג', 'וייס', 'שפירא', 'קליין', 'ברגר', 'הורוביץ', 'אדלר', 'פישר', 'גרינברג', 'שטרן', 'מזרחי', 'פרץ', 'אוחיון', 'ביטון', 'דהן', 'קפלן', 'זילברמן', 'רוט', 'לנדאו', 'טייטלבוים', 'אשכנזי'];

const AREAS: Area[] = ['BNEI_BRAK', 'JERUSALEM', 'BEIT_SHEMESH', 'ELAD', 'MODIIN_ILLIT', 'BEITAR_ILLIT'];

const STREETS: Record<Area, string[]> = {
  BNEI_BRAK: ['רבי עקיבא', 'ז׳בוטינסקי', 'חזון איש', 'הרב כהנמן', 'השומר', 'אהבת שלום'],
  JERUSALEM: ['בר אילן', 'יחזקאל', 'מלכי ישראל', 'סורוצקין', 'פנים מאירות', 'שמגר'],
  BEIT_SHEMESH: ['נחל לכיש', 'נחל שורק', 'נהר הירדן', 'נחל דולב', 'רש״י', 'דרך האבות'],
  ELAD: ['רבי יהודה הנשיא', 'רבי מאיר בעל הנס', 'שמעון בן שטח', 'רבי יוחנן בן זכאי', 'אבן גבירול', 'רבי עקיבא'],
  MODIIN_ILLIT: ['נתיבות המשפט', 'אבני נזר', 'קהילות יעקב', 'חזון איש', 'מסילת יוסף', 'דברי חיים'],
  BEITAR_ILLIT: ['המגיד ממזריטש', 'קדושת לוי', 'בעל שם טוב', 'הרב יהודה צדקה', 'אוהל יהושע', 'בית יוסף'],
};

const CONTACTS = ['הבן', 'הבת', 'הנכד', 'השכנה', 'האחות', 'העובדת הסוציאלית', 'הגבאי'];

interface Template {
  title: string;
  description: string;
}

const TEMPLATES: Record<TaskType, Template[]> = {
  ESCORT_PATIENT: [
    { title: 'ליווי לטיפול בבית החולים', description: 'ליווי מטופל לטיפול קבוע בבית החולים והמתנה עד סיום הטיפול. נדרשים סבלנות ונוכחות נעימה.' },
    { title: 'ליווי לבדיקות במרפאה', description: 'ליווי לבדיקות ולרופא המשפחה במרפאה השכונתית, כולל עזרה בתורים ובמילוי טפסים.' },
    { title: 'ליווי לפיזיותרפיה', description: 'ליווי לטיפול פיזיותרפיה אחרי ניתוח, ועזרה בהליכה מהרכב לחדר הטיפולים ובחזרה.' },
    { title: 'ביקור אצל מאושפז', description: 'ביקור אצל מאושפז שאין לו משפחה קרובה בעיר: שיחה, עזרה קטנה ונוכחות תומכת.' },
  ],
  FOOD_BASKETS: [
    { title: 'חלוקת סלי מזון לשבת', description: 'אריזה וחלוקה של סלי מזון לשבת למשפחות בשכונה. רצוי רכב, אבל לא חובה.' },
    { title: 'אריזת סלים במחסן הגמ״ח', description: 'אריזת מוצרי יסוד לסלים במחסן, לפי רשימה מסודרת. עבודה בצוות, כשעתיים.' },
    { title: 'חלוקת ארוחות חמות', description: 'איסוף ארוחות חמות מהמטבח הקהילתי וחלוקה לבתים לפי רשימה מוכנה מראש.' },
    { title: 'חלוקת סלים לקראת החג', description: 'חלוקה מוגברת של סלי מזון לקראת החג. דרושים כמה מתנדבים במקביל, עם רכב או בלי.' },
  ],
  ELDERLY_HELP: [
    { title: 'קניות שבועיות לקשישה', description: 'ביצוע קניות שבועיות לפי רשימה והבאה עד הבית. הקשישה מתקשה לצאת מהבית.' },
    { title: 'עזרה בסידור הבית', description: 'עזרה קלה בסידור הבית והזזת רהיטים לקראת הגעה של מטפלת חדשה.' },
    { title: 'ביקור חברתי אצל קשיש', description: 'ביקור של כשעה: שיחה, קריאה ומשחק שחמט. הקשיש גר לבד ושמח מאוד לחברה.' },
    { title: 'עזרה בטפסים ובקביעת תורים', description: 'עזרה במילוי טפסים לביטוח הלאומי ובקביעת תורים טלפוניים לרופאים.' },
  ],
  TRANSPORT: [
    { title: 'הסעה לבדיקות בבית החולים', description: 'הסעה הלוך וחזור לבדיקות שגרתיות. משך משוער: שלוש שעות כולל המתנה.' },
    { title: 'הסעה לשמחה משפחתית', description: 'הסעה של קשישה לחתונת נכדה בעיר אחרת, ובחזרה בסוף הערב.' },
    { title: 'הסעת ציוד רפואי', description: 'איסוף כיסא גלגלים ומיטה מתכווננת מגמ״ח ציוד רפואי והעברה לבית המשפחה.' },
    { title: 'הסעה לטיפול קבוע', description: 'הסעה לטיפול קבוע בבית החולים. הטיפול נמשך כארבע שעות, וההחזרה בתיאום טלפוני.' },
  ],
  OTHER: [
    { title: 'עזרה בהעברת דירה', description: 'עזרה בסחיבת ארגזים ורהיטים קלים למשפחה שעוברת דירה בשכונה.' },
    { title: 'שיעורי עזר לילדים', description: 'עזרה בהכנת שיעורי בית לילדי משפחה שאחד ההורים מאושפז. כשעה וחצי.' },
    { title: 'תיקונים קטנים בבית', description: 'תיקון ברז מטפטף, החלפת נורות וחיזוק מדף. נדרשים כלי עבודה בסיסיים.' },
    { title: 'השגחה על ילדים', description: 'השגחה על ילדים לכמה שעות, בזמן שההורים מלווים קרוב משפחה בבית החולים.' },
  ],
};

const TIMES: Record<TaskType, string[]> = {
  ESCORT_PATIENT: ['08:00', '08:30', '09:00', '10:30', '13:00'],
  FOOD_BASKETS: ['10:00', '12:00', '16:00', '19:30', '20:30'],
  ELDERLY_HELP: ['09:30', '11:00', '16:30', '17:00', '18:00'],
  TRANSPORT: ['07:30', '08:15', '09:30', '14:00', '18:30'],
  OTHER: ['15:00', '16:00', '17:30', '19:00', '20:00'],
};

function volunteersNeededFor(type: TaskType): number {
  if (type === 'FOOD_BASKETS') return randomInt(2, 6);
  if (type === 'OTHER') return randomInt(1, 3);
  return randomInt(1, 2);
}

function privateDetailsFor(area: Area): string | null {
  if (chance(0.15)) return null;
  const familyPhone = `055000${String(randomInt(1000, 9999))}`;
  return `רחוב ${pick(STREETS[area])} ${randomInt(1, 60)}, קומה ${randomInt(0, 4)}. איש קשר: ${pick(CONTACTS)}, ${familyPhone}`;
}

function fullName(female: boolean): string {
  return `${pick(female ? FEMALE_NAMES : MALE_NAMES)} ${pick(LAST_NAMES)}`;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// ---------- ההרצה ----------

async function main() {
  const reset = process.argv.includes('--reset');

  const password = process.env.SEED_DEMO_PASSWORD || (env.NODE_ENV === 'production' ? '' : 'Hesed2026');
  if (!password) {
    console.warn('⚠️  SEED_DEMO_PASSWORD לא הוגדר - נתוני ההדגמה לא נוצרו.');
    return;
  }

  const usersCount = await prisma.user.count();
  if (usersCount > 0 && !reset) {
    console.log('ℹ️  במסד הנתונים כבר יש נתונים - ה-Seed לא שינה דבר. (למילוי מחדש: npm run db:seed -- --reset)');
    return;
  }

  if (reset) {
    await prisma.signup.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
    console.log('🗑️  הנתונים הקודמים נמחקו');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  // --- רכזים: אחד לכל עיר. הראשונה היא חשבון ההדגמה ---
  const coordinatorNames = ['מרים כהן', 'דוד פרידמן', 'שרה גולדשטיין', 'אליהו מזרחי', 'חנה רוזנברג', 'יעקב שטרן'];
  const coordinators = await Promise.all(
    AREAS.map((area, index) =>
      prisma.user.create({
        data: {
          fullName: coordinatorNames[index],
          phone: `050100000${index + 1}`,
          passwordHash,
          role: 'COORDINATOR',
          status: 'APPROVED',
          createdAt: daysAgo(200 - index * 3),
        },
      }).then((user) => ({ ...user, area })),
    ),
  );

  // --- מתנדבים: 40. הראשון הוא חשבון ההדגמה (מאושר), השני ממתין לאישור ---
  const volunteerData: Prisma.UserCreateManyInput[] = [];
  for (let i = 1; i <= 40; i++) {
    let status: UserStatus = 'APPROVED';
    if (i === 2 || i >= 36) status = 'PENDING';
    if (i === 34 || i === 35) status = 'REJECTED';
    const female = i % 2 === 0;
    volunteerData.push({
      fullName: i === 1 ? 'יוסף לוי' : i === 2 ? 'אברהם ישראלי' : fullName(female),
      phone: `05020000${String(i).padStart(2, '0')}`,
      passwordHash,
      role: 'VOLUNTEER',
      status,
      createdAt: status === 'PENDING' ? daysAgo(randomInt(0, 6)) : daysAgo(randomInt(20, 180)),
    });
  }
  await prisma.user.createMany({ data: volunteerData });
  const volunteers = await prisma.user.findMany({ where: { role: 'VOLUNTEER' }, orderBy: { phone: 'asc' } });
  const approved = volunteers.filter((v) => v.status === 'APPROVED');
  const demoVolunteer = approved[0];

  // --- משימות: 10 לכל עיר, בטווח של כ-5 שבועות אחורה ו-4 שבועות קדימה ---
  const today = todayInIsrael();
  const types = Object.keys(TEMPLATES) as TaskType[];
  let taskCount = 0;
  let signupCount = 0;

  for (const coordinator of coordinators) {
    for (let n = 0; n < 10; n++) {
      const type = types[(n + taskCount) % types.length];
      const template = pick(TEMPLATES[type]);
      const offset = n < 3 ? -randomInt(2, 35) : randomInt(0, 28);
      const isPast = offset < 0;
      const needed = volunteersNeededFor(type);
      // רוב המשימות נוצרות ע"י הרכז/ת של העיר, ולפעמים ע"י רכז/ת מעיר אחרת
      const creator = chance(0.85) ? coordinator : pick(coordinators.filter((c) => c.id !== coordinator.id));

      // מי הצטרף: מתנדבים מאושרים, ולפעמים גם רכז/ת אחר/ת
      const pool = shuffle([...approved, ...coordinators.filter((c) => c.id !== creator.id && chance(0.1))]);
      const joined = isPast ? needed : chance(0.35) ? needed : randomInt(0, needed - 1);
      const participants = pool.slice(0, joined);
      const cancelled = chance(0.2) ? pool.slice(joined, joined + 1) : [];

      const status: TaskStatus = isPast ? 'DONE' : joined >= needed ? 'TAKEN' : 'OPEN';
      const date = addDays(today, offset);
      const createdAt = isPast ? daysAgo(-offset + randomInt(3, 10)) : daysAgo(randomInt(0, 12));

      await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          type,
          area: coordinator.area,
          date: dateStringToDate(date),
          time: pick(TIMES[type]),
          volunteersNeeded: needed,
          privateDetails: privateDetailsFor(coordinator.area),
          status,
          createdById: creator.id,
          createdAt,
          signups: {
            create: [
              ...participants.map((p) => ({
                volunteerId: p.id,
                status: 'ACTIVE' as const,
                reportedDone: isPast ? chance(0.7) : false,
                joinedAt: createdAt,
              })),
              ...cancelled.map((p) => ({
                volunteerId: p.id,
                status: 'CANCELLED' as const,
                joinedAt: createdAt,
                cancelledAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
              })),
            ],
          },
        },
      });
      taskCount++;
      signupCount += participants.length + cancelled.length;
    }
  }

  // --- מצבים מובטחים לחשבון המתנדב לדוגמה, כדי שיהיה מה לבדוק ---
  const demoCoordinator = coordinators[0];
  const demoTasks: Array<{ offset: number; status: TaskStatus; signup: 'ACTIVE' | 'CANCELLED'; reportedDone: boolean; template: Template; type: TaskType; needed: number }> = [
    { offset: 3, status: 'OPEN', signup: 'ACTIVE', reportedDone: false, template: TEMPLATES.FOOD_BASKETS[0], type: 'FOOD_BASKETS', needed: 3 },
    { offset: -6, status: 'DONE', signup: 'ACTIVE', reportedDone: true, template: TEMPLATES.TRANSPORT[0], type: 'TRANSPORT', needed: 1 },
    { offset: 9, status: 'OPEN', signup: 'CANCELLED', reportedDone: false, template: TEMPLATES.ELDERLY_HELP[0], type: 'ELDERLY_HELP', needed: 1 },
  ];
  for (const demo of demoTasks) {
    const createdAt = daysAgo(Math.max(1, -demo.offset + 4));
    await prisma.task.create({
      data: {
        title: demo.template.title,
        description: demo.template.description,
        type: demo.type,
        area: 'BNEI_BRAK',
        date: dateStringToDate(addDays(today, demo.offset)),
        time: pick(TIMES[demo.type]),
        volunteersNeeded: demo.needed,
        privateDetails: `רחוב ${pick(STREETS.BNEI_BRAK)} ${randomInt(1, 60)}, קומה ${randomInt(0, 4)}. איש קשר: ${pick(CONTACTS)}, 055000${randomInt(1000, 9999)}`,
        status: demo.status,
        createdById: demoCoordinator.id,
        createdAt,
        signups: {
          create: {
            volunteerId: demoVolunteer.id,
            status: demo.signup,
            reportedDone: demo.reportedDone,
            joinedAt: createdAt,
            cancelledAt: demo.signup === 'CANCELLED' ? new Date() : null,
          },
        },
      },
    });
    taskCount++;
    signupCount++;
  }

  console.log('✅ נתוני ההדגמה נוצרו:');
  console.log(`   ${coordinators.length} רכזים, ${volunteers.length} מתנדבים, ${taskCount} משימות, ${signupCount} הצטרפויות`);
  console.log('   חשבונות לבדיקה (הסיסמה: הערך של SEED_DEMO_PASSWORD):');
  console.log(`   רכז/ת:            ${demoCoordinator.phone} (${demoCoordinator.fullName})`);
  console.log(`   מתנדב מאושר:      ${demoVolunteer.phone} (${demoVolunteer.fullName})`);
  console.log(`   מתנדב ממתין:      ${volunteers[1].phone} (${volunteers[1].fullName})`);
}

main()
  .catch((error) => {
    console.error('❌ שגיאה ביצירת נתוני ההדגמה:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// תיעוד ה-API בפורמט OpenAPI 3 - מוצג ב-Swagger UI בכתובת /api-docs
// אותו מסמך נשמר גם כקובץ docs/openapi.json (npm run docs:export)
import {
  AREA_LABELS,
  AREAS,
  TASK_STATUSES,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  USER_STATUSES,
} from '../constants/labels';

// ---------- עזרים לכתיבה קצרה ----------

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema: object, example?: unknown) => ({
  content: { 'application/json': { schema, ...(example !== undefined ? { example } : {}) } },
});

const errorResponse = (description: string, message: string) => ({
  description,
  ...json(ref('Error'), { message }),
});

// תשובות שגיאה שחוזרות בהרבה נקודות קצה
const e400 = { description: 'נתונים לא תקינים', ...json(ref('Error'), {
  message: 'הנתונים שנשלחו אינם תקינים',
  details: [{ field: 'title', message: 'הכותרת חייבת להכיל לפחות 3 תווים' }],
}) };
const e401 = errorResponse('לא מחובר: Token חסר, לא תקין או שפג תוקפו', 'נדרשת התחברות. יש לשלוח Token בכותרת Authorization');
const e403Coordinator = errorResponse('אין הרשאה: הפעולה לרכזים בלבד', 'פעולה זו מותרת לרכזים בלבד');
const e404Task = errorResponse('המשימה לא נמצאה', 'המשימה לא נמצאה');
const e404Volunteer = errorResponse('המתנדב לא נמצא', 'המתנדב לא נמצא');

const secured = [{ bearerAuth: [] }];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'מזהה',
  schema: { type: 'integer', minimum: 1 },
  example: 1,
};

// ---------- דוגמאות ----------

const exampleUser = {
  id: 7,
  fullName: 'יוסף לוי',
  phone: '0527000007',
  role: 'VOLUNTEER',
  roleLabel: 'מתנדב/ת',
  status: 'APPROVED',
  statusLabel: 'מאושר',
  createdAt: '2026-09-01T10:00:00.000Z',
};

const exampleTaskSummary = {
  id: 12,
  title: 'הסעה לבדיקות בבית החולים',
  description: 'הסעה של קשיש מבני ברק לבדיקות שגרתיות וחזרה הביתה. משך משוער: שלוש שעות.',
  type: 'TRANSPORT',
  typeLabel: 'הסעה',
  area: 'BNEI_BRAK',
  areaLabel: 'בני ברק',
  date: '2026-11-03',
  time: '09:30',
  volunteersNeeded: 1,
  joinedCount: 0,
  status: 'OPEN',
  statusLabel: 'פתוחה',
  createdBy: { id: 1, fullName: 'מרים כהן' },
  createdAt: '2026-10-20T08:00:00.000Z',
  updatedAt: '2026-10-20T08:00:00.000Z',
  mySignup: null,
  actions: { canEdit: false, canComplete: false, canJoin: true, canCancel: false, canReportDone: false },
};

const exampleTaskDetail = {
  ...exampleTaskSummary,
  joinedCount: 1,
  status: 'TAKEN',
  statusLabel: 'נתפסה',
  mySignup: { reportedDone: false },
  actions: { canEdit: false, canComplete: false, canJoin: false, canCancel: true, canReportDone: true },
  privateDetails: 'רחוב הדוגמה 12, קומה 2. איש קשר: הבן, 0550000123',
};

const exampleTaskInput = {
  title: 'הסעה לבדיקות בבית החולים',
  description: 'הסעה של קשיש מבני ברק לבדיקות שגרתיות וחזרה הביתה. משך משוער: שלוש שעות.',
  type: 'TRANSPORT',
  area: 'BNEI_BRAK',
  date: '2026-11-03',
  time: '09:30',
  volunteersNeeded: 1,
  privateDetails: 'רחוב הדוגמה 12, קומה 2. איש קשר: הבן, 0550000123',
};

const optionsSchema = { type: 'array', items: ref('Option') };

// ---------- המסמך ----------

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'רגע של חסד - API',
    version: '1.0.0',
    description: [
      'שרת לניהול משימות התנדבות בקהילה.',
      '',
      '**איך בודקים כאן נקודות קצה מוגנות:**',
      '1. פותחים את `POST /api/auth/login`, לוחצים **Try it out**, מזינים טלפון וסיסמה ולוחצים **Execute**.',
      '2. מעתיקים את הערך של `token` מהתשובה.',
      '3. לוחצים על הכפתור **Authorize** למעלה, מדביקים את ה-Token (בלי המילה Bearer) ולוחצים **Authorize**.',
      '4. מעכשיו כל קריאה תישלח עם ה-Token.',
      '',
      'בלי Token מתקבלת שגיאה 401. פעולה שאינה מותרת לתפקיד מחזירה 403.',
      '',
      'כל הודעות השגיאה בעברית, במבנה `{ "message": "...", "details": [...] }`.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'מערכת', description: 'בדיקת תקינות ורשימות בחירה' },
    { name: 'התחברות', description: 'הרשמה, התחברות ופרטי המשתמש המחובר' },
    { name: 'משימות', description: 'רשימה, פרטים, הוספה, עריכה וסימון ביצוע' },
    { name: 'השתתפות במשימה', description: 'הצטרפות, ביטול הצטרפות ודיווח ביצוע' },
    { name: 'ניהול מתנדבים', description: 'לרכזים בלבד: אישור, דחייה וקידום לרכז/ת' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'ה-Token שהתקבל בהתחברות. מדביקים אותו בלי המילה Bearer.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', description: 'הודעת שגיאה בעברית' },
          details: {
            type: 'array',
            description: 'פירוט לפי שדה (בשגיאות ולידציה)',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      Option: {
        type: 'object',
        properties: { value: { type: 'string' }, label: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          fullName: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['COORDINATOR', 'VOLUNTEER'] },
          roleLabel: { type: 'string', description: 'שם התפקיד בעברית' },
          status: { type: 'string', enum: USER_STATUSES },
          statusLabel: { type: 'string', description: 'שם הסטטוס בעברית' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: exampleUser,
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string', description: 'JWT לשליחה בכותרת Authorization' }, user: ref('User') },
      },
      Volunteer: {
        allOf: [
          ref('User'),
          {
            type: 'object',
            properties: { activeSignupsCount: { type: 'integer', description: 'בכמה משימות המתנדב פעיל כרגע' } },
          },
        ],
      },
      TaskInput: {
        type: 'object',
        required: ['title', 'description', 'type', 'area', 'date', 'time', 'volunteersNeeded'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 80, description: 'כותרת' },
          description: { type: 'string', minLength: 10, maxLength: 1000, description: 'תיאור' },
          type: {
            type: 'string',
            enum: TASK_TYPES,
            description: `סוג משימה: ${TASK_TYPES.map((t) => `${t}=${TASK_TYPE_LABELS[t]}`).join(', ')}`,
          },
          area: {
            type: 'string',
            enum: AREAS,
            description: `אזור: ${AREAS.map((a) => `${a}=${AREA_LABELS[a]}`).join(', ')}`,
          },
          date: { type: 'string', format: 'date', description: 'YYYY-MM-DD. ביצירה: היום או בעתיד' },
          time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'HH:mm' },
          volunteersNeeded: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            description: 'כמות מתנדבים נדרשת. בעריכה: לא פחות ממספר המצטרפים',
          },
          privateDetails: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'פרטים למתנדבים (כתובת ואיש קשר). לא חובה',
          },
        },
        example: exampleTaskInput,
      },
      TaskSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: TASK_TYPES },
          typeLabel: { type: 'string' },
          area: { type: 'string', enum: AREAS },
          areaLabel: { type: 'string' },
          date: { type: 'string', format: 'date' },
          time: { type: 'string' },
          volunteersNeeded: { type: 'integer' },
          joinedCount: { type: 'integer', description: 'כמה מתנדבים פעילים במשימה' },
          status: { type: 'string', enum: TASK_STATUSES },
          statusLabel: { type: 'string' },
          createdBy: {
            type: 'object',
            properties: { id: { type: 'integer' }, fullName: { type: 'string' } },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          mySignup: {
            type: 'object',
            nullable: true,
            description: 'ההשתתפות של המשתמש המחובר, או null אם לא הצטרף',
            properties: { reportedDone: { type: 'boolean' } },
          },
          actions: {
            type: 'object',
            description: 'אילו פעולות המשתמש המחובר יכול לבצע במשימה (להצגת כפתורים)',
            properties: {
              canEdit: { type: 'boolean' },
              canComplete: { type: 'boolean' },
              canJoin: { type: 'boolean' },
              canCancel: { type: 'boolean' },
              canReportDone: { type: 'boolean' },
            },
          },
        },
        example: exampleTaskSummary,
      },
      TaskSignup: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          volunteer: {
            type: 'object',
            properties: { id: { type: 'integer' }, fullName: { type: 'string' }, phone: { type: 'string' } },
          },
          status: { type: 'string', enum: ['ACTIVE', 'CANCELLED'] },
          statusLabel: { type: 'string' },
          reportedDone: { type: 'boolean' },
          joinedAt: { type: 'string', format: 'date-time' },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      TaskDetail: {
        allOf: [
          ref('TaskSummary'),
          {
            type: 'object',
            properties: {
              privateDetails: {
                type: 'string',
                nullable: true,
                description: 'מופיע רק לרכזים ולמי שפעיל במשימה',
              },
              signups: {
                type: 'array',
                items: ref('TaskSignup'),
                description: 'מופיע לרכזים בלבד, כולל מתנדבים שביטלו',
              },
            },
          },
        ],
        example: exampleTaskDetail,
      },
      Signup: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          taskId: { type: 'integer' },
          status: { type: 'string', enum: ['ACTIVE', 'CANCELLED'] },
          statusLabel: { type: 'string' },
          reportedDone: { type: 'boolean' },
          joinedAt: { type: 'string', format: 'date-time' },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['מערכת'],
        summary: 'בדיקה שהשרת ומסד הנתונים פעילים',
        responses: {
          '200': { description: 'הכול תקין', ...json({ type: 'object' }, { status: 'ok', database: 'ok', time: '2026-10-25T10:00:00.000Z' }) },
          '503': { description: 'אין חיבור למסד הנתונים', ...json({ type: 'object' }, { status: 'error', database: 'unreachable', message: 'אין חיבור למסד הנתונים' }) },
        },
      },
    },
    '/api/meta': {
      get: {
        tags: ['מערכת'],
        summary: 'רשימות הבחירה עם השמות בעברית',
        description: 'לשימוש בטפסים ובסינון: סוגי משימות, אזורים, סטטוסים ואפשרויות מיון.',
        responses: {
          '200': {
            description: 'הרשימות',
            ...json(
              {
                type: 'object',
                properties: {
                  taskTypes: optionsSchema,
                  areas: optionsSchema,
                  taskStatuses: optionsSchema,
                  userStatuses: optionsSchema,
                  roles: optionsSchema,
                  signupStatuses: optionsSchema,
                  sortOptions: optionsSchema,
                },
              },
              {
                taskTypes: [{ value: 'TRANSPORT', label: 'הסעה' }],
                areas: [{ value: 'BNEI_BRAK', label: 'בני ברק' }],
                taskStatuses: [{ value: 'OPEN', label: 'פתוחה' }],
              },
            ),
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['התחברות'],
        summary: 'הרשמת מתנדב חדש',
        description: 'המתנדב נוצר בסטטוס "ממתין לאישור" (PENDING). עד שרכז/ת מאשר/ת, הוא יכול לראות משימות פתוחות אבל לא להצטרף.',
        requestBody: {
          required: true,
          ...json(
            {
              type: 'object',
              required: ['fullName', 'phone', 'password'],
              properties: {
                fullName: { type: 'string', minLength: 2, maxLength: 60 },
                phone: { type: 'string', description: '10 ספרות שמתחילות ב-05' },
                password: { type: 'string', minLength: 8, description: 'לפחות 8 תווים, אות באנגלית וספרה' },
              },
            },
            { fullName: 'אברהם ישראלי', phone: '0529999999', password: 'Hesed2026' },
          ),
        },
        responses: {
          '201': { description: 'נרשם בהצלחה', ...json(ref('AuthResponse'), { token: 'eyJhbGciOi...', user: { ...exampleUser, status: 'PENDING', statusLabel: 'ממתין לאישור' } }) },
          '400': e400,
          '409': errorResponse('הטלפון כבר רשום', 'מספר הטלפון כבר רשום במערכת'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['התחברות'],
        summary: 'התחברות',
        description: 'מחזירה JWT. מעתיקים את ה-token ולוחצים Authorize.',
        requestBody: {
          required: true,
          ...json(
            {
              type: 'object',
              required: ['phone', 'password'],
              properties: { phone: { type: 'string' }, password: { type: 'string' } },
            },
            { phone: '0501000001', password: 'הסיסמה שהוגדרה ב-SEED_DEMO_PASSWORD' },
          ),
        },
        responses: {
          '200': { description: 'התחברות הצליחה', ...json(ref('AuthResponse'), { token: 'eyJhbGciOi...', user: exampleUser }) },
          '400': e400,
          '401': errorResponse('טלפון או סיסמה שגויים', 'מספר טלפון או סיסמה שגויים'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['התחברות'],
        summary: 'פרטי המשתמש המחובר',
        security: secured,
        responses: {
          '200': { description: 'המשתמש', ...json({ type: 'object', properties: { user: ref('User') } }, { user: exampleUser }) },
          '401': e401,
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['משימות'],
        summary: 'רשימת משימות, עם חיפוש, סינון ומיון',
        description: [
          'מה כל אחד רואה:',
          '- רכז/ת: כל המשימות.',
          '- מתנדב מאושר: משימות פתוחות + משימות שהוא פעיל בהן.',
          '- מתנדב ממתין או נדחה: משימות פתוחות בלבד.',
          '',
          'השדה privateDetails לא מופיע ברשימה.',
        ].join('\n'),
        security: secured,
        parameters: [
          { name: 'search', in: 'query', description: 'חיפוש חופשי בכותרת ובתיאור', schema: { type: 'string' } },
          { name: 'area', in: 'query', description: 'סינון לפי אזור', schema: { type: 'string', enum: AREAS } },
          { name: 'type', in: 'query', description: 'סינון לפי סוג', schema: { type: 'string', enum: TASK_TYPES } },
          { name: 'status', in: 'query', description: 'סינון לפי סטטוס', schema: { type: 'string', enum: TASK_STATUSES } },
          { name: 'sort', in: 'query', description: 'מיון לפי תאריך', schema: { type: 'string', enum: ['date_asc', 'date_desc'], default: 'date_asc' } },
          { name: 'mine', in: 'query', description: 'true = רק משימות שהצטרפתי אליהן', schema: { type: 'string', enum: ['true', 'false'], default: 'false' } },
        ],
        responses: {
          '200': { description: 'מערך משימות', ...json({ type: 'array', items: ref('TaskSummary') }, [exampleTaskSummary]) },
          '400': e400,
          '401': e401,
        },
      },
      post: {
        tags: ['משימות'],
        summary: 'יצירת משימה (רכזים)',
        description: 'המשימה נוצרת בסטטוס "פתוחה". התאריך חייב להיות היום או בעתיד.',
        security: secured,
        requestBody: { required: true, ...json(ref('TaskInput'), exampleTaskInput) },
        responses: {
          '201': { description: 'המשימה נוצרה', ...json(ref('TaskDetail')) },
          '400': e400,
          '401': e401,
          '403': e403Coordinator,
        },
      },
    },
    '/api/tasks/{id}': {
      get: {
        tags: ['משימות'],
        summary: 'פרטי משימה',
        description: 'privateDetails מופיע רק לרכזים ולמי שפעיל במשימה. signups (רשימת המתנדבים) מופיע לרכזים בלבד.',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': { description: 'המשימה', ...json(ref('TaskDetail'), exampleTaskDetail) },
          '400': e400,
          '401': e401,
          '403': errorResponse('אין הרשאה לצפות במשימה', 'אין לך הרשאה לצפות במשימה זו'),
          '404': e404Task,
        },
      },
      put: {
        tags: ['משימות'],
        summary: 'עריכת משימה (הרכז/ת שיצר/ה אותה)',
        description: 'שולחים את כל שדות הטופס. הסטטוס מחושב מחדש לפי מספר המצטרפים.',
        security: secured,
        parameters: [idParam],
        requestBody: { required: true, ...json(ref('TaskInput'), exampleTaskInput) },
        responses: {
          '200': { description: 'המשימה המעודכנת', ...json(ref('TaskDetail')) },
          '400': e400,
          '401': e401,
          '403': errorResponse('לא הרכז/ת שיצר/ה את המשימה', 'ניתן לשנות רק משימות שיצרת'),
          '404': e404Task,
          '409': errorResponse('המשימה כבר בוצעה', 'המשימה כבר סומנה כבוצעה, ולא ניתן לשנות אותה'),
        },
      },
    },
    '/api/tasks/{id}/complete': {
      patch: {
        tags: ['משימות'],
        summary: 'סימון משימה כ"בוצעה" (הרכז/ת שיצר/ה אותה)',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': { description: 'המשימה, בסטטוס DONE', ...json(ref('TaskDetail')) },
          '401': e401,
          '403': errorResponse('לא הרכז/ת שיצר/ה את המשימה', 'ניתן לשנות רק משימות שיצרת'),
          '404': e404Task,
          '409': errorResponse('המשימה כבר בוצעה', 'המשימה כבר סומנה כבוצעה, ולא ניתן לשנות אותה'),
        },
      },
    },
    '/api/tasks/{id}/join': {
      post: {
        tags: ['השתתפות במשימה'],
        summary: 'הצטרפות למשימה (מתנדב מאושר או רכז/ת)',
        description: 'רק למשימה פתוחה. כשמספר המצטרפים מגיע לכמות הנדרשת, המשימה הופכת ל"נתפסה".',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': { description: 'המשימה עם הסטטוס המעודכן', ...json(ref('TaskDetail')) },
          '401': e401,
          '403': errorResponse('החשבון לא מאושר', 'החשבון שלך ממתין לאישור רכז/ת, ולכן עדיין אי אפשר להצטרף למשימות'),
          '404': e404Task,
          '409': errorResponse('כבר הצטרפת / המשימה מלאה / בוצעה', 'המשימה כבר מלאה - הצטרף המספר הנדרש של מתנדבים'),
        },
      },
    },
    '/api/tasks/{id}/cancel': {
      post: {
        tags: ['השתתפות במשימה'],
        summary: 'ביטול הצטרפות',
        description: 'אפשרי כל עוד המשימה לא בוצעה. משימה "נתפסה" חוזרת ל"פתוחה". הביטול נשמר ומוצג לרכז/ת.',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': { description: 'המשימה עם הסטטוס המעודכן', ...json(ref('TaskDetail')) },
          '401': e401,
          '403': errorResponse('החשבון לא מאושר', 'החשבון שלך אינו מאושר להשתתפות במשימות'),
          '404': e404Task,
          '409': errorResponse('לא הצטרפת / המשימה בוצעה', 'לא הצטרפת למשימה זו'),
        },
      },
    },
    '/api/tasks/{id}/report-done': {
      post: {
        tags: ['השתתפות במשימה'],
        summary: 'דיווח "ביצעתי"',
        description: 'הדיווח מוצג לרכז/ת ליד שם המתנדב. הוא לא משנה את סטטוס המשימה.',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': {
            description: 'ההצטרפות המעודכנת',
            ...json(ref('Signup'), { id: 30, taskId: 12, status: 'ACTIVE', statusLabel: 'פעיל', reportedDone: true, joinedAt: '2026-10-21T09:00:00.000Z', cancelledAt: null }),
          },
          '401': e401,
          '403': errorResponse('החשבון לא מאושר', 'החשבון שלך אינו מאושר להשתתפות במשימות'),
          '404': e404Task,
          '409': errorResponse('לא הצטרפת / המשימה בוצעה', 'לא הצטרפת למשימה זו'),
        },
      },
    },
    '/api/volunteers': {
      get: {
        tags: ['ניהול מתנדבים'],
        summary: 'רשימת מתנדבים (רכזים)',
        security: secured,
        parameters: [
          { name: 'status', in: 'query', description: 'סינון לפי סטטוס', schema: { type: 'string', enum: USER_STATUSES } },
        ],
        responses: {
          '200': { description: 'מערך מתנדבים (בלי סיסמאות)', ...json({ type: 'array', items: ref('Volunteer') }, [{ ...exampleUser, activeSignupsCount: 2 }]) },
          '400': e400,
          '401': e401,
          '403': e403Coordinator,
        },
      },
    },
    '/api/volunteers/{id}/status': {
      patch: {
        tags: ['ניהול מתנדבים'],
        summary: 'אישור או דחייה של מתנדב (רכזים)',
        description: 'REJECTED משמש גם לחסימה. הצטרפויות קיימות נשארות, ורק הצטרפויות חדשות נחסמות.',
        security: secured,
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json(
            { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED'] } } },
            { status: 'APPROVED' },
          ),
        },
        responses: {
          '200': { description: 'המתנדב המעודכן', ...json(ref('User'), exampleUser) },
          '400': e400,
          '401': e401,
          '403': e403Coordinator,
          '404': e404Volunteer,
        },
      },
    },
    '/api/volunteers/{id}/promote': {
      patch: {
        tags: ['ניהול מתנדבים'],
        summary: 'קידום מתנדב מאושר לרכז/ת (רכזים)',
        description: 'הקידום חד-כיווני. ההצטרפויות של המתנדב נשארות.',
        security: secured,
        parameters: [idParam],
        responses: {
          '200': { description: 'המשתמש המעודכן', ...json(ref('User'), { ...exampleUser, role: 'COORDINATOR', roleLabel: 'רכז/ת התנדבויות' }) },
          '401': e401,
          '403': e403Coordinator,
          '404': e404Volunteer,
          '409': errorResponse('המתנדב לא מאושר', 'ניתן לקדם לרכז/ת רק מתנדב מאושר'),
        },
      },
    },
  },
};

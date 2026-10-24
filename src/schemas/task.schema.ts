// ולידציה למשימות: טופס הוספה/עריכה, ופרמטרים של חיפוש וסינון
import { z } from 'zod';
import { AREAS, TASK_STATUSES, TASK_TYPES } from '../constants/labels';
import { number, text } from './common.schema';

/** בודק שהתאריך קיים באמת (למשל 2026-02-30 לא קיים) */
function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const dateString = text('יש להזין תאריך', 'התאריך חייב להיות טקסט')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין. הפורמט הנדרש: YYYY-MM-DD')
  .refine(isRealDate, 'תאריך לא קיים בלוח השנה');

/** שדות טופס המשימה - אותו טופס משמש להוספה ולעריכה */
export const taskBodySchema = z.object({
  title: text('יש להזין כותרת', 'הכותרת חייבת להיות טקסט')
    .trim()
    .min(3, 'הכותרת חייבת להכיל לפחות 3 תווים')
    .max(80, 'הכותרת יכולה להכיל עד 80 תווים'),
  description: text('יש להזין תיאור', 'התיאור חייב להיות טקסט')
    .trim()
    .min(10, 'התיאור חייב להכיל לפחות 10 תווים')
    .max(1000, 'התיאור יכול להכיל עד 1000 תווים'),
  type: z.enum(TASK_TYPES, { error: 'יש לבחור סוג משימה מהרשימה' }),
  area: z.enum(AREAS, { error: 'יש לבחור אזור מהרשימה' }),
  date: dateString,
  time: text('יש להזין שעה', 'השעה חייבת להיות טקסט').regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'שעה לא תקינה. הפורמט הנדרש: HH:mm, למשל 09:30',
  ),
  volunteersNeeded: number('יש להזין כמות מתנדבים', 'כמות המתנדבים חייבת להיות מספר')
    .int('כמות המתנדבים חייבת להיות מספר שלם')
    .min(1, 'נדרש לפחות מתנדב אחד')
    .max(20, 'ניתן לבקש עד 20 מתנדבים'),
  privateDetails: z
    .string({ error: 'הפרטים למתנדבים חייבים להיות טקסט' })
    .trim()
    .max(500, 'הפרטים למתנדבים יכולים להכיל עד 500 תווים')
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type TaskBodyInput = z.output<typeof taskBodySchema>;

/** פרמטרים של חיפוש, סינון ומיון ברשימת המשימות */
export const taskListQuerySchema = z.object({
  search: z.string().trim().max(100, 'החיפוש יכול להכיל עד 100 תווים').optional(),
  area: z.enum(AREAS, { error: 'אזור לא תקין' }).optional(),
  type: z.enum(TASK_TYPES, { error: 'סוג משימה לא תקין' }).optional(),
  status: z.enum(TASK_STATUSES, { error: 'סטטוס לא תקין' }).optional(),
  sort: z.enum(['date_asc', 'date_desc'], { error: 'מיון לא תקין. אפשרויות: date_asc או date_desc' }).default('date_asc'),
  mine: z
    .enum(['true', 'false'], { error: 'הערך של mine חייב להיות true או false' })
    .default('false')
    .transform((value) => value === 'true'),
});

export type TaskListQuery = z.output<typeof taskListQuerySchema>;

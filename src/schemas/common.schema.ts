// ולידציות משותפות לכמה טפסים
import { z } from 'zod';

/** טקסט: הודעה אחת כשהשדה חסר, והודעה אחרת כשנשלח משהו שאינו טקסט */
export function text(requiredMessage: string, typeMessage: string) {
  return z.string({ error: (issue) => (issue.input === undefined ? requiredMessage : typeMessage) });
}

/** מספר: הודעה אחת כשהשדה חסר, והודעה אחרת כשנשלח משהו שאינו מספר */
export function number(requiredMessage: string, typeMessage: string) {
  return z.number({ error: (issue) => (issue.input === undefined ? requiredMessage : typeMessage) });
}

/** מזהה בכתובת, למשל /api/tasks/12 */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'המזהה חייב להיות מספר' })
    .int('המזהה חייב להיות מספר שלם')
    .positive('המזהה חייב להיות מספר חיובי'),
});

/** טלפון נייד ישראלי: 10 ספרות שמתחילות ב-05. מקפים ורווחים מוסרים אוטומטית */
export const phoneSchema = text('יש להזין מספר טלפון', 'מספר הטלפון חייב להיות טקסט')
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^05\d{8}$/, 'מספר טלפון לא תקין. יש להזין 10 ספרות שמתחילות ב-05'));

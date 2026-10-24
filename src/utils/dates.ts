// עזרים לתאריכים. כל התאריכים במערכת הם "יום" בלבד (בלי שעה), לפי שעון ישראל.

const ISRAEL_TZ = 'Asia/Jerusalem';

/** התאריך של היום בישראל, בפורמט YYYY-MM-DD */
export function todayInIsrael(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_TZ }).format(new Date());
}

/** הופך YYYY-MM-DD לאובייקט Date (חצות UTC), כפי ש-Prisma שומר עמודת DATE */
export function dateStringToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** הופך Date שהגיע מעמודת DATE חזרה ל-YYYY-MM-DD */
export function dateToDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** מוסיף מספר ימים לתאריך בפורמט YYYY-MM-DD */
export function addDays(value: string, days: number): string {
  const date = dateStringToDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToDateString(date);
}

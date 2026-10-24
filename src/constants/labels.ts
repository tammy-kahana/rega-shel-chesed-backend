// השמות בעברית של כל ערכי הבחירה במערכת.
// בקוד ובמסד הנתונים נשמר הקוד באנגלית (למשל OPEN), ובמסך מציגים את השם בעברית (פתוחה).
// ה-React מקבל את הרשימות האלה מ-GET /api/meta.
import type { Area, Role, SignupStatus, TaskStatus, TaskType, UserStatus } from '@prisma/client';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  ESCORT_PATIENT: 'ליווי חולה',
  FOOD_BASKETS: 'חלוקת סלי מזון',
  ELDERLY_HELP: 'עזרה לקשיש',
  TRANSPORT: 'הסעה',
  OTHER: 'אחר',
};

export const AREA_LABELS: Record<Area, string> = {
  BNEI_BRAK: 'בני ברק',
  JERUSALEM: 'ירושלים',
  BEIT_SHEMESH: 'בית שמש',
  ELAD: 'אלעד',
  MODIIN_ILLIT: 'מודיעין עילית',
  BEITAR_ILLIT: 'ביתר עילית',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'פתוחה',
  TAKEN: 'נתפסה',
  DONE: 'בוצעה',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: 'ממתין לאישור',
  APPROVED: 'מאושר',
  REJECTED: 'נדחה',
};

export const ROLE_LABELS: Record<Role, string> = {
  COORDINATOR: 'רכז/ת התנדבויות',
  VOLUNTEER: 'מתנדב/ת',
};

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  ACTIVE: 'פעיל',
  CANCELLED: 'בוטל',
};

/** הופך מילון של תוויות לרשימה {value, label} - נוח לתיבות בחירה */
export function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

/** רשימות הערכים (באנגלית) - משמשות את הולידציה, כדי שיהיה מקור אחד בלבד */
export const TASK_TYPES = Object.keys(TASK_TYPE_LABELS) as [TaskType, ...TaskType[]];
export const AREAS = Object.keys(AREA_LABELS) as [Area, ...Area[]];
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as [TaskStatus, ...TaskStatus[]];
export const USER_STATUSES = Object.keys(USER_STATUS_LABELS) as [UserStatus, ...UserStatus[]];

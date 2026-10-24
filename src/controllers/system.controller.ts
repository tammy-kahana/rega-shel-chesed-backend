import type { Request, Response } from 'express';
import {
  AREA_LABELS,
  ROLE_LABELS,
  SIGNUP_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  USER_STATUS_LABELS,
  toOptions,
} from '../constants/labels';
import { prisma } from '../db/prisma';

/** בדיקה שהשרת ומסד הנתונים פעילים */
export async function health(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', message: 'אין חיבור למסד הנתונים' });
  }
}

/** כל רשימות הבחירה עם השמות בעברית - לטפסים ולסינון */
export function meta(_req: Request, res: Response) {
  res.json({
    taskTypes: toOptions(TASK_TYPE_LABELS),
    areas: toOptions(AREA_LABELS),
    taskStatuses: toOptions(TASK_STATUS_LABELS),
    userStatuses: toOptions(USER_STATUS_LABELS),
    roles: toOptions(ROLE_LABELS),
    signupStatuses: toOptions(SIGNUP_STATUS_LABELS),
    sortOptions: [
      { value: 'date_asc', label: 'תאריך - הקרובות ראשונות' },
      { value: 'date_desc', label: 'תאריך - הרחוקות ראשונות' },
    ],
  });
}

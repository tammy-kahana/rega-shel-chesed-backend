// עזרים משותפים לבדיקות: יצירת משתמשים, Tokens ומשימות
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Role, UserStatus } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { createToken } from '../src/services/token.service';
import { addDays, todayInIsrael } from '../src/utils/dates';

export const api = () => request(app);
export const PASSWORD = 'Password123';

let phoneCounter = 0;
/** מספר טלפון ייחודי לכל משתמש בבדיקות */
export function nextPhone(): string {
  phoneCounter += 1;
  return `058${String(Date.now() % 10000).padStart(4, '0')}${String(phoneCounter).padStart(3, '0')}`;
}

export async function createUser(role: Role, status: UserStatus = 'APPROVED', fullName = 'משתמש בדיקה') {
  const user = await prisma.user.create({
    data: { fullName, phone: nextPhone(), passwordHash: await bcrypt.hash(PASSWORD, 4), role, status },
  });
  const token = createToken(user.id);
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export const coordinator = (status: UserStatus = 'APPROVED') => createUser('COORDINATOR', status, 'רכזת בדיקה');
export const volunteer = (status: UserStatus = 'APPROVED') => createUser('VOLUNTEER', status, 'מתנדב בדיקה');

export function futureDate(days = 7): string {
  return addDays(todayInIsrael(), days);
}

export function taskInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'חלוקת סלי מזון לשבת',
    description: 'אריזה וחלוקה של סלי מזון לשבת למשפחות בשכונה.',
    type: 'FOOD_BASKETS',
    area: 'BNEI_BRAK',
    date: futureDate(),
    time: '10:00',
    volunteersNeeded: 2,
    privateDetails: 'רחוב הדוגמה 5, קומה 1. איש קשר: 0550000001',
    ...overrides,
  };
}

/** יוצר משימה דרך ה-API (כמו שה-React יעשה) ומחזיר אותה */
export async function createTaskViaApi(auth: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const res = await api().post('/api/tasks').set(auth).send(taskInput(overrides));
  if (res.status !== 201) {
    throw new Error(`יצירת המשימה נכשלה: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: number; status: string; [key: string]: unknown };
}

export async function resetData() {
  await prisma.signup.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
}

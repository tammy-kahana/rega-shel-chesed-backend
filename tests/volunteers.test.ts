// בדיקות ניהול מתנדבים: הרשאות, אישור, דחייה וקידום לרכז/ת
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, coordinator, createTaskViaApi, resetData, taskInput, volunteer } from './helpers';

beforeAll(resetData);
afterAll(() => prisma.$disconnect());

describe('רשימת מתנדבים - GET /api/volunteers', () => {
  it('רכז/ת מקבל/ת רשימה בלי סיסמאות, וסינון לפי סטטוס עובד', async () => {
    const { auth } = await coordinator();
    const pending = await volunteer('PENDING');
    await volunteer('APPROVED');

    const all = await api().get('/api/volunteers').set(auth);
    expect(all.status).toBe(200);
    expect(all.body.every((v: { role: string }) => v.role === 'VOLUNTEER')).toBe(true);
    expect(JSON.stringify(all.body)).not.toContain('passwordHash');

    const onlyPending = await api().get('/api/volunteers').query({ status: 'PENDING' }).set(auth);
    expect(onlyPending.body.map((v: { id: number }) => v.id)).toEqual([pending.user.id]);
    expect(onlyPending.body[0]).toMatchObject({ statusLabel: 'ממתין לאישור', activeSignupsCount: 0 });
  });

  it('מתנדב לא יכול לראות את רשימת המתנדבים - 403', async () => {
    const { auth } = await volunteer();
    expect((await api().get('/api/volunteers').set(auth)).status).toBe(403);
  });

  it('בלי Token - 401', async () => {
    expect((await api().get('/api/volunteers')).status).toBe(401);
  });
});

describe('אישור ודחייה - PATCH /api/volunteers/:id/status', () => {
  it('אחרי אישור, המתנדב יכול להצטרף מיד (בלי להתחבר מחדש)', async () => {
    const coord = await coordinator();
    const pending = await volunteer('PENDING');
    const task = await createTaskViaApi(coord.auth);

    expect((await api().post(`/api/tasks/${task.id}/join`).set(pending.auth)).status).toBe(403);

    const res = await api().patch(`/api/volunteers/${pending.user.id}/status`).set(coord.auth).send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'APPROVED', statusLabel: 'מאושר' });

    expect((await api().post(`/api/tasks/${task.id}/join`).set(pending.auth)).status).toBe(200);
  });

  it('חסימה (REJECTED) מונעת הצטרפויות חדשות, אבל ההצטרפות הקיימת נשמרת', async () => {
    const coord = await coordinator();
    const v = await volunteer();
    const first = await createTaskViaApi(coord.auth);
    const second = await createTaskViaApi(coord.auth);
    await api().post(`/api/tasks/${first.id}/join`).set(v.auth).expect(200);

    await api().patch(`/api/volunteers/${v.user.id}/status`).set(coord.auth).send({ status: 'REJECTED' }).expect(200);

    expect((await api().post(`/api/tasks/${second.id}/join`).set(v.auth)).status).toBe(403);
    const kept = await prisma.signup.findFirstOrThrow({ where: { taskId: first.id, volunteerId: v.user.id } });
    expect(kept.status).toBe('ACTIVE');
  });

  it('סטטוס לא תקין - 400, מתנדב שלא קיים - 404', async () => {
    const coord = await coordinator();
    const v = await volunteer('PENDING');
    expect((await api().patch(`/api/volunteers/${v.user.id}/status`).set(coord.auth).send({ status: 'BOSS' })).status).toBe(400);
    expect((await api().patch('/api/volunteers/999999/status').set(coord.auth).send({ status: 'APPROVED' })).status).toBe(404);
  });

  it('אי אפשר לשנות סטטוס של רכז/ת דרך הכתובת הזו - 404', async () => {
    const coord = await coordinator();
    const other = await coordinator();
    const res = await api().patch(`/api/volunteers/${other.user.id}/status`).set(coord.auth).send({ status: 'REJECTED' });
    expect(res.status).toBe(404);
  });

  it('מתנדב לא יכול לאשר מתנדבים - 403', async () => {
    const v = await volunteer();
    const pending = await volunteer('PENDING');
    const res = await api().patch(`/api/volunteers/${pending.user.id}/status`).set(v.auth).send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });
});

describe('קידום לרכז/ת - PATCH /api/volunteers/:id/promote', () => {
  it('מתנדב מאושר מקודם, ויכול מיד ליצור משימות. ההצטרפויות שלו נשארות', async () => {
    const coord = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(coord.auth);
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);

    const res = await api().patch(`/api/volunteers/${v.user.id}/promote`).set(coord.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'COORDINATOR', roleLabel: 'רכז/ת התנדבויות' });

    expect((await api().post('/api/tasks').set(v.auth).send(taskInput())).status).toBe(201);
    const signup = await prisma.signup.findFirstOrThrow({ where: { taskId: task.id, volunteerId: v.user.id } });
    expect(signup.status).toBe('ACTIVE');
  });

  it('אי אפשר לקדם מתנדב שלא אושר - 409', async () => {
    const coord = await coordinator();
    const pending = await volunteer('PENDING');
    const res = await api().patch(`/api/volunteers/${pending.user.id}/promote`).set(coord.auth);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('ניתן לקדם לרכז/ת רק מתנדב מאושר');
  });

  it('מתנדב לא יכול לקדם - 403', async () => {
    const v = await volunteer();
    const other = await volunteer();
    expect((await api().patch(`/api/volunteers/${other.user.id}/promote`).set(v.auth)).status).toBe(403);
  });
});

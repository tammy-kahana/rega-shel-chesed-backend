// בדיקות משימות: הרשאות, CRUD, ולידציה, חיפוש וסינון, פרטיות
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { addDays, todayInIsrael } from '../src/utils/dates';
import { api, coordinator, createTaskViaApi, futureDate, resetData, taskInput, volunteer } from './helpers';

beforeAll(resetData);
afterAll(() => prisma.$disconnect());

describe('יצירת משימה - POST /api/tasks', () => {
  it('רכז/ת יוצר/ת משימה - 201, בסטטוס "פתוחה"', async () => {
    const { user, auth } = await coordinator();
    const res = await api().post('/api/tasks').set(auth).send(taskInput());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'חלוקת סלי מזון לשבת',
      type: 'FOOD_BASKETS',
      typeLabel: 'חלוקת סלי מזון',
      areaLabel: 'בני ברק',
      status: 'OPEN',
      statusLabel: 'פתוחה',
      joinedCount: 0,
      createdBy: { id: user.id },
      actions: { canEdit: true, canComplete: true },
    });
    expect(res.body.privateDetails).toContain('רחוב הדוגמה');
  });

  it('מתנדב לא יכול ליצור משימה - 403', async () => {
    const { auth } = await volunteer();
    const res = await api().post('/api/tasks').set(auth).send(taskInput());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('פעולה זו מותרת לרכזים בלבד');
  });

  it('בלי Token - 401', async () => {
    const res = await api().post('/api/tasks').send(taskInput());
    expect(res.status).toBe(401);
  });

  it('ולידציה: שדות חסרים ושגויים - 400 עם פירוט', async () => {
    const { auth } = await coordinator();
    const res = await api()
      .post('/api/tasks')
      .set(auth)
      .send({ title: 'א', description: 'קצר', type: 'PARTY', area: 'TEL_AVIV', date: '2026-02-30', time: '25:00', volunteersNeeded: 0 });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['title', 'description', 'type', 'area', 'date', 'time', 'volunteersNeeded']),
    );
  });

  it('ולידציה: תאריך שעבר - 400', async () => {
    const { auth } = await coordinator();
    const res = await api().post('/api/tasks').set(auth).send(taskInput({ date: addDays(todayInIsrael(), -1) }));
    expect(res.status).toBe(400);
    expect(res.body.details[0]).toEqual({ field: 'date', message: 'תאריך המשימה חייב להיות היום או בעתיד' });
  });

  it('ולידציה: יותר מ-20 מתנדבים - 400', async () => {
    const { auth } = await coordinator();
    const res = await api().post('/api/tasks').set(auth).send(taskInput({ volunteersNeeded: 21 }));
    expect(res.status).toBe(400);
  });

  it('גוף בקשה שאינו JSON תקין - 400', async () => {
    const { auth } = await coordinator();
    const res = await api().post('/api/tasks').set(auth).set('Content-Type', 'application/json').send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('גוף הבקשה אינו JSON תקין');
  });
});

describe('עריכה - PUT /api/tasks/:id', () => {
  it('הרכז/ת שיצר/ה עורך/ת את המשימה', async () => {
    const { auth } = await coordinator();
    const task = await createTaskViaApi(auth);
    const res = await api().put(`/api/tasks/${task.id}`).set(auth).send(taskInput({ title: 'כותרת חדשה', time: '18:30' }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'כותרת חדשה', time: '18:30' });
  });

  it('רכז/ת אחר/ת לא יכול/ה לערוך - 403', async () => {
    const owner = await coordinator();
    const other = await coordinator();
    const task = await createTaskViaApi(owner.auth);
    const res = await api().put(`/api/tasks/${task.id}`).set(other.auth).send(taskInput({ title: 'ניסיון' }));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('ניתן לשנות רק משימות שיצרת');
  });

  it('מתנדב לא יכול לערוך - 403', async () => {
    const owner = await coordinator();
    const { auth } = await volunteer();
    const task = await createTaskViaApi(owner.auth);
    const res = await api().put(`/api/tasks/${task.id}`).set(auth).send(taskInput());
    expect(res.status).toBe(403);
  });

  it('לא ניתן להוריד את כמות המתנדבים מתחת למספר המצטרפים - 400', async () => {
    const owner = await coordinator();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 3 });
    for (let i = 0; i < 2; i++) {
      const v = await volunteer();
      await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    }
    const res = await api().put(`/api/tasks/${task.id}`).set(owner.auth).send(taskInput({ volunteersNeeded: 1 }));
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('volunteersNeeded');
  });

  it('הקטנת הכמות למספר המצטרפים הופכת את המשימה ל"נתפסה"', async () => {
    const owner = await coordinator();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 3 });
    const v = await volunteer();
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    const res = await api().put(`/api/tasks/${task.id}`).set(owner.auth).send(taskInput({ volunteersNeeded: 1 }));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TAKEN');
  });

  it('משימה שלא קיימת - 404, ומזהה לא תקין - 400', async () => {
    const { auth } = await coordinator();
    expect((await api().put('/api/tasks/999999').set(auth).send(taskInput())).status).toBe(404);
    expect((await api().get('/api/tasks/abc').set(auth)).status).toBe(400);
  });
});

describe('סימון "בוצעה" - PATCH /api/tasks/:id/complete', () => {
  it('הרכז/ת שיצר/ה מסמן/ת, ואחר כך אי אפשר לערוך או להצטרף - 409', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth);

    const res = await api().patch(`/api/tasks/${task.id}/complete`).set(owner.auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DONE');
    expect(res.body.actions.canEdit).toBe(false);

    expect((await api().put(`/api/tasks/${task.id}`).set(owner.auth).send(taskInput())).status).toBe(409);
    expect((await api().patch(`/api/tasks/${task.id}/complete`).set(owner.auth)).status).toBe(409);
    expect((await api().post(`/api/tasks/${task.id}/join`).set(v.auth)).status).toBe(409);
  });

  it('רכז/ת אחר/ת לא יכול/ה לסמן - 403, ומתנדב - 403', async () => {
    const owner = await coordinator();
    const other = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth);
    expect((await api().patch(`/api/tasks/${task.id}/complete`).set(other.auth)).status).toBe(403);
    expect((await api().patch(`/api/tasks/${task.id}/complete`).set(v.auth)).status).toBe(403);
  });
});

describe('הצטרפות, ביטול ודיווח', () => {
  it('משימה הופכת ל"נתפסה" כשהגיעו מספיק מתנדבים, ומתנדב נוסף מקבל 409', async () => {
    const owner = await coordinator();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 2 });
    const [a, b, c] = [await volunteer(), await volunteer(), await volunteer()];

    const first = await api().post(`/api/tasks/${task.id}/join`).set(a.auth);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'OPEN', joinedCount: 1, mySignup: { reportedDone: false } });

    const second = await api().post(`/api/tasks/${task.id}/join`).set(b.auth);
    expect(second.body).toMatchObject({ status: 'TAKEN', statusLabel: 'נתפסה', joinedCount: 2 });

    const third = await api().post(`/api/tasks/${task.id}/join`).set(c.auth);
    expect(third.status).toBe(409);
  });

  it('אי אפשר להצטרף פעמיים - 409', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 3 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    const res = await api().post(`/api/tasks/${task.id}/join`).set(v.auth);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('כבר הצטרפת למשימה זו');
  });

  it('ביטול מחזיר משימה "נתפסה" ל"פתוחה", והרכז/ת רואה את הביטול', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 1 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);

    const res = await api().post(`/api/tasks/${task.id}/cancel`).set(v.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'OPEN', joinedCount: 0, mySignup: null });

    const forOwner = await api().get(`/api/tasks/${task.id}`).set(owner.auth);
    expect(forOwner.body.signups).toHaveLength(1);
    expect(forOwner.body.signups[0]).toMatchObject({ status: 'CANCELLED', statusLabel: 'בוטל', volunteer: { id: v.user.id } });
    expect(forOwner.body.signups[0].cancelledAt).not.toBeNull();
  });

  it('אחרי ביטול אפשר להצטרף שוב (אותה רשומה חוזרת לפעילה)', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 1 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    await api().post(`/api/tasks/${task.id}/cancel`).set(v.auth).expect(200);
    const res = await api().post(`/api/tasks/${task.id}/join`).set(v.auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TAKEN');
    expect(await prisma.signup.count({ where: { taskId: task.id } })).toBe(1);
  });

  it('ביטול בלי הצטרפות - 409', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth);
    expect((await api().post(`/api/tasks/${task.id}/cancel`).set(v.auth)).status).toBe(409);
  });

  it('דיווח ביצוע מופיע אצל הרכז/ת ולא משנה את סטטוס המשימה', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 2 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);

    const res = await api().post(`/api/tasks/${task.id}/report-done`).set(v.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ taskId: task.id, status: 'ACTIVE', reportedDone: true });

    const forOwner = await api().get(`/api/tasks/${task.id}`).set(owner.auth);
    expect(forOwner.body.status).toBe('OPEN');
    expect(forOwner.body.signups[0].reportedDone).toBe(true);
  });

  it('אחרי דיווח ביצוע אי אפשר לבטל את ההצטרפות - 409, והכפתור לא מוצג', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 2 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    await api().post(`/api/tasks/${task.id}/report-done`).set(v.auth).expect(200);

    const forVolunteer = await api().get(`/api/tasks/${task.id}`).set(v.auth);
    expect(forVolunteer.body.actions.canCancel).toBe(false);
    expect(forVolunteer.body.actions.canReportDone).toBe(false);

    const res = await api().post(`/api/tasks/${task.id}/cancel`).set(v.auth);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('כבר דיווחת שביצעת את המשימה, ולכן אי אפשר לבטל את ההצטרפות');
  });

  it('דיווח בלי הצטרפות - 409', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth);
    expect((await api().post(`/api/tasks/${task.id}/report-done`).set(v.auth)).status).toBe(409);
  });

  it('מתנדב ממתין או נדחה לא יכול להצטרף - 403', async () => {
    const owner = await coordinator();
    const pending = await volunteer('PENDING');
    const rejected = await volunteer('REJECTED');
    const task = await createTaskViaApi(owner.auth);

    const p = await api().post(`/api/tasks/${task.id}/join`).set(pending.auth);
    expect(p.status).toBe(403);
    expect(p.body.message).toContain('ממתין לאישור');
    expect((await api().post(`/api/tasks/${task.id}/join`).set(rejected.auth)).status).toBe(403);
  });

  it('רכז/ת יכול/ה להצטרף למשימה כמו מתנדב', async () => {
    const owner = await coordinator();
    const other = await coordinator();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 1 });
    const res = await api().post(`/api/tasks/${task.id}/join`).set(other.auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TAKEN');
  });

  it('שני מתנדבים שמצטרפים באותו רגע למקום אחרון - רק אחד מצליח', async () => {
    const owner = await coordinator();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 1 });
    const [a, b] = [await volunteer(), await volunteer()];
    const results = await Promise.all([
      api().post(`/api/tasks/${task.id}/join`).set(a.auth),
      api().post(`/api/tasks/${task.id}/join`).set(b.auth),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.signup.count({ where: { taskId: task.id, status: 'ACTIVE' } })).toBe(1);
  });
});

describe('צפייה ופרטיות', () => {
  it('privateDetails לא מופיע ברשימה, ולא למתנדב שלא הצטרף. אחרי הצטרפות - מופיע', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { title: 'בדיקת פרטיות ייחודית' });

    const list = await api().get('/api/tasks').query({ search: 'בדיקת פרטיות ייחודית' }).set(v.auth);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].privateDetails).toBeUndefined();

    const before = await api().get(`/api/tasks/${task.id}`).set(v.auth);
    expect(before.status).toBe(200);
    expect(before.body.privateDetails).toBeUndefined();
    expect(before.body.signups).toBeUndefined();

    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    const after = await api().get(`/api/tasks/${task.id}`).set(v.auth);
    expect(after.body.privateDetails).toContain('רחוב הדוגמה');
    expect(after.body.signups).toBeUndefined(); // שמות וטלפונים - רק לרכזים
  });

  it('מתנדב לא רואה משימה "נתפסה" שהוא לא חלק ממנה - 403', async () => {
    const owner = await coordinator();
    const [a, b] = [await volunteer(), await volunteer()];
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 1 });
    await api().post(`/api/tasks/${task.id}/join`).set(a.auth).expect(200);

    const res = await api().get(`/api/tasks/${task.id}`).set(b.auth);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('אין לך הרשאה לצפות במשימה זו');
  });

  it('אחרי ביטול, המתנדב כבר לא רואה את הפרטים למתנדבים', async () => {
    const owner = await coordinator();
    const v = await volunteer();
    const task = await createTaskViaApi(owner.auth, { volunteersNeeded: 2 });
    await api().post(`/api/tasks/${task.id}/join`).set(v.auth).expect(200);
    await api().post(`/api/tasks/${task.id}/cancel`).set(v.auth).expect(200);
    const res = await api().get(`/api/tasks/${task.id}`).set(v.auth);
    expect(res.body.privateDetails).toBeUndefined();
  });
});

describe('רשימה, חיפוש, סינון ומיון - GET /api/tasks', () => {
  let ids: { open: number; taken: number; done: number; jerusalem: number };
  let owner: Awaited<ReturnType<typeof coordinator>>;
  let joined: Awaited<ReturnType<typeof volunteer>>;

  beforeAll(async () => {
    await resetData();
    owner = await coordinator();
    joined = await volunteer();

    const open = await createTaskViaApi(owner.auth, { title: 'קניות לקשישה', type: 'ELDERLY_HELP', date: futureDate(10), volunteersNeeded: 2 });
    const taken = await createTaskViaApi(owner.auth, { title: 'הסעה לבית החולים', type: 'TRANSPORT', date: futureDate(3), volunteersNeeded: 1 });
    const done = await createTaskViaApi(owner.auth, { title: 'חלוקת ארוחות חמות', date: futureDate(1), volunteersNeeded: 1 });
    const jerusalem = await createTaskViaApi(owner.auth, {
      title: 'ליווי לפיזיותרפיה',
      description: 'ליווי לטיפול אחרי ניתוח, בירושלים.',
      type: 'ESCORT_PATIENT',
      area: 'JERUSALEM',
      date: futureDate(20),
    });

    await api().post(`/api/tasks/${taken.id}/join`).set(joined.auth).expect(200);
    await api().post(`/api/tasks/${done.id}/join`).set(joined.auth).expect(200);
    await api().patch(`/api/tasks/${done.id}/complete`).set(owner.auth).expect(200);
    ids = { open: open.id, taken: taken.id, done: done.id, jerusalem: jerusalem.id };
  });

  const idsOf = (body: Array<{ id: number }>) => body.map((t) => t.id);

  it('רכז/ת רואה את כל המשימות', async () => {
    const res = await api().get('/api/tasks').set(owner.auth);
    expect(res.status).toBe(200);
    expect(idsOf(res.body).sort()).toEqual(Object.values(ids).sort());
  });

  it('מתנדב מאושר רואה משימות פתוחות + המשימות שלו', async () => {
    const res = await api().get('/api/tasks').set(joined.auth);
    expect(idsOf(res.body).sort()).toEqual([ids.open, ids.taken, ids.done, ids.jerusalem].sort());

    const stranger = await volunteer();
    const res2 = await api().get('/api/tasks').set(stranger.auth);
    expect(idsOf(res2.body).sort()).toEqual([ids.open, ids.jerusalem].sort());
  });

  it('מתנדב ממתין רואה משימות פתוחות בלבד', async () => {
    const pending = await volunteer('PENDING');
    const res = await api().get('/api/tasks').set(pending.auth);
    expect(res.body.every((t: { status: string }) => t.status === 'OPEN')).toBe(true);
    expect(res.body[0].actions.canJoin).toBe(false);
  });

  it('mine=true מחזיר רק משימות שהמשתמש הצטרף אליהן', async () => {
    const res = await api().get('/api/tasks').query({ mine: 'true' }).set(joined.auth);
    expect(idsOf(res.body).sort()).toEqual([ids.taken, ids.done].sort());
  });

  it('חיפוש חופשי בכותרת ובתיאור', async () => {
    const byTitle = await api().get('/api/tasks').query({ search: 'קשישה' }).set(owner.auth);
    expect(idsOf(byTitle.body)).toEqual([ids.open]);
    const byDescription = await api().get('/api/tasks').query({ search: 'אחרי ניתוח' }).set(owner.auth);
    expect(idsOf(byDescription.body)).toEqual([ids.jerusalem]);
  });

  it('סינון לפי אזור, סוג וסטטוס', async () => {
    const byArea = await api().get('/api/tasks').query({ area: 'JERUSALEM' }).set(owner.auth);
    expect(idsOf(byArea.body)).toEqual([ids.jerusalem]);
    const byType = await api().get('/api/tasks').query({ type: 'TRANSPORT' }).set(owner.auth);
    expect(idsOf(byType.body)).toEqual([ids.taken]);
    const byStatus = await api().get('/api/tasks').query({ status: 'DONE' }).set(owner.auth);
    expect(idsOf(byStatus.body)).toEqual([ids.done]);
  });

  it('מיון לפי תאריך: הקרובות ראשונות, ובסדר הפוך', async () => {
    const asc = await api().get('/api/tasks').set(owner.auth);
    expect(idsOf(asc.body)).toEqual([ids.done, ids.taken, ids.open, ids.jerusalem]);
    const desc = await api().get('/api/tasks').query({ sort: 'date_desc' }).set(owner.auth);
    expect(idsOf(desc.body)).toEqual([ids.jerusalem, ids.open, ids.taken, ids.done]);
  });

  it('ערך סינון לא תקין - 400', async () => {
    const res = await api().get('/api/tasks').query({ area: 'TEL_AVIV' }).set(owner.auth);
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('area');
  });
});

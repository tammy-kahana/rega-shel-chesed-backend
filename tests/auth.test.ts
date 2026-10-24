// בדיקות הרשמה, התחברות ו-Token
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, nextPhone, PASSWORD, resetData, volunteer } from './helpers';

beforeAll(resetData);
afterAll(() => prisma.$disconnect());

describe('הרשמה - POST /api/auth/register', () => {
  it('מתנדב חדש נרשם בסטטוס "ממתין לאישור" ומקבל Token', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'אברהם ישראלי', phone: '052-999-0001', password: 'Hesed2026' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      fullName: 'אברהם ישראלי',
      phone: '0529990001', // המקפים הוסרו
      role: 'VOLUNTEER',
      status: 'PENDING',
      statusLabel: 'ממתין לאישור',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const saved = await prisma.user.findUniqueOrThrow({ where: { phone: '0529990001' } });
    expect(saved.passwordHash).not.toBe('Hesed2026'); // נשמר מוצפן
  });

  it('אי אפשר להירשם פעמיים עם אותו טלפון - 409', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'כפיל', phone: '0529990001', password: 'Hesed2026' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('מספר הטלפון כבר רשום במערכת');
  });

  it('נתונים לא תקינים מחזירים 400 עם פירוט בעברית לפי שדה', async () => {
    const res = await api().post('/api/auth/register').send({ fullName: 'א', phone: '123', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'phone', 'password']));
  });

  it('גם אם נשלחים role או status - נרשמים תמיד כמתנדב ממתין', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'מנסה להיות רכז', phone: nextPhone(), password: 'Hesed2026', role: 'COORDINATOR', status: 'APPROVED' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('VOLUNTEER');
    expect(res.body.user.status).toBe('PENDING');
  });
});

describe('התחברות - POST /api/auth/login', () => {
  it('התחברות תקינה מחזירה Token ופרטי משתמש', async () => {
    const { user } = await volunteer();
    const res = await api().post('/api/auth/login').send({ phone: user.phone, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('סיסמה שגויה - 401', async () => {
    const { user } = await volunteer();
    const res = await api().post('/api/auth/login').send({ phone: user.phone, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('מספר טלפון או סיסמה שגויים');
  });

  it('טלפון שלא קיים - 401 עם אותה הודעה', async () => {
    const res = await api().post('/api/auth/login').send({ phone: '0500000000', password: 'Whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('מספר טלפון או סיסמה שגויים');
  });

  it('שדות חסרים - 400', async () => {
    const res = await api().post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Token - GET /api/auth/me', () => {
  it('עם Token תקין מחזיר את המשתמש המחובר', async () => {
    const { user, auth } = await volunteer();
    const res = await api().get('/api/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, role: 'VOLUNTEER' });
  });

  it('בלי Token - 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('Token לא תקין - 401', async () => {
    const res = await api().get('/api/auth/me').set({ Authorization: 'Bearer not-a-real-token' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token לא תקין');
  });

  it('Token שנחתם עם מפתח אחר - 401', async () => {
    const { user } = await volunteer();
    const forged = jwt.sign({ sub: String(user.id) }, 'some-other-secret-that-is-long-enough-123');
    const res = await api().get('/api/auth/me').set({ Authorization: `Bearer ${forged}` });
    expect(res.status).toBe(401);
  });

  it('Token שפג תוקפו - 401 עם הודעה מתאימה', async () => {
    const { user } = await volunteer();
    const expired = jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET as string, { expiresIn: -10 });
    const res = await api().get('/api/auth/me').set({ Authorization: `Bearer ${expired}` });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('פג תוקף ההתחברות. יש להתחבר מחדש');
  });

  it('Token של משתמש שנמחק - 401', async () => {
    const { user, auth } = await volunteer();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set(auth);
    expect(res.status).toBe(401);
  });
});

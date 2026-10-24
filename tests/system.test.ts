// בדיקות מערכת: בריאות השרת, רשימות בחירה, Swagger, ותקינות מסד הנתונים מול סכמת Prisma
import SwaggerParser from '@apidevtools/swagger-parser';
import { Prisma } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { openApiDocument } from '../src/docs/openapi';
import { api } from './helpers';

afterAll(() => prisma.$disconnect());

/** כל נקודות הקצה שהוגדרו באפיון */
const ENDPOINTS: Array<[method: string, path: string]> = [
  ['get', '/api/health'],
  ['get', '/api/meta'],
  ['post', '/api/auth/register'],
  ['post', '/api/auth/login'],
  ['get', '/api/auth/me'],
  ['get', '/api/tasks'],
  ['post', '/api/tasks'],
  ['get', '/api/tasks/{id}'],
  ['put', '/api/tasks/{id}'],
  ['patch', '/api/tasks/{id}/complete'],
  ['post', '/api/tasks/{id}/join'],
  ['post', '/api/tasks/{id}/cancel'],
  ['post', '/api/tasks/{id}/report-done'],
  ['get', '/api/volunteers'],
  ['patch', '/api/volunteers/{id}/status'],
  ['patch', '/api/volunteers/{id}/promote'],
];

describe('מערכת', () => {
  it('GET /api/health - השרת ומסד הנתונים פעילים', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('GET /api/meta - רשימות בחירה עם שמות בעברית', async () => {
    const res = await api().get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.areas).toHaveLength(6);
    expect(res.body.areas).toContainEqual({ value: 'BNEI_BRAK', label: 'בני ברק' });
    expect(res.body.taskTypes).toContainEqual({ value: 'OTHER', label: 'אחר' });
    expect(res.body.taskStatuses).toEqual([
      { value: 'OPEN', label: 'פתוחה' },
      { value: 'TAKEN', label: 'נתפסה' },
      { value: 'DONE', label: 'בוצעה' },
    ]);
  });

  it('כתובת שלא קיימת - 404 בעברית', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('לא קיימת');
  });

  it('CORS - השרת מחזיר כותרת Access-Control-Allow-Origin', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('Swagger / OpenAPI', () => {
  it('המסמך תקין לפי תקן OpenAPI 3', async () => {
    const copy = JSON.parse(JSON.stringify(openApiDocument));
    await expect(SwaggerParser.validate(copy)).resolves.toBeTruthy();
  });

  it('כל נקודות הקצה מתועדות, ויש הגדרת Bearer JWT', () => {
    const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
    for (const [method, path] of ENDPOINTS) {
      expect(paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
  });

  it('כל נקודת קצה מתועדת באמת קיימת בשרת (לא 404)', async () => {
    for (const [method, path] of ENDPOINTS) {
      const url = path.replace('{id}', '1');
      const res = await (api() as unknown as Record<string, (u: string) => Promise<{ status: number; body: { message?: string } }>>)[method](url);
      expect(res.body.message ?? '', `${method.toUpperCase()} ${path}`).not.toContain('לא קיימת');
    }
  });

  it('דף Swagger UI נפתח ב-/api-docs, והמסמך זמין ב-/api-docs.json', async () => {
    const page = await api().get('/api-docs/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('swagger-ui');
    const doc = await api().get('/api-docs.json');
    expect(doc.body.openapi).toBe('3.0.3');
  });
});

describe('Prisma ומסד הנתונים', () => {
  it('כל טבלה ועמודה בסכמת Prisma קיימת במסד הנתונים (ה-Migration תואם לסכמה)', async () => {
    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name::text AS table_name, column_name::text AS column_name FROM information_schema.columns WHERE table_schema = 'public'`;
    const existing = new Set(columns.map((c) => `${c.table_name}.${c.column_name}`));

    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName ?? model.name;
      for (const field of model.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum')) {
        expect(existing.has(`${table}.${field.dbName ?? field.name}`), `${table}.${field.name}`).toBe(true);
      }
    }
  });

  it('אילוצי התקינות במסד הנתונים פעילים (למשל: טלפון חייב להיות 10 ספרות שמתחילות ב-05)', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO "users" ("fullName", "phone", "passwordHash") VALUES ('x', '123', 'x')`,
    ).rejects.toThrow();
  });
});

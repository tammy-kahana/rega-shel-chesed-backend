// שומר את תיעוד ה-API לקובץ docs/openapi.json (אפשר לייבא אותו ל-Postman או לכלים אחרים)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const target = join(__dirname, '..', 'docs', 'openapi.json');
mkdirSync(join(__dirname, '..', 'docs'), { recursive: true });
writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
console.log(`✅ נשמר: ${target}`);

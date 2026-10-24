// הרכבת אפליקציית Express: CORS, JSON, Swagger, ה-API וטיפול בשגיאות.
// (ההפעלה עצמה, listen, נמצאת ב-server.ts - כך אפשר לבדוק את האפליקציה בבדיקות בלי להפעיל שרת)
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import { openApiDocument } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({ origin: corsOrigins === '*' ? '*' : corsOrigins }));
app.use(express.json({ limit: '100kb' }));

// תיעוד ה-API
app.get('/api-docs.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'רגע של חסד - תיעוד API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get('/', (_req, res) => {
  res.json({ message: 'שרת "רגע של חסד" פעיל', docs: '/api-docs', health: '/api/health' });
});

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

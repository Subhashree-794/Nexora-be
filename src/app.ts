import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { registerRoutes } from './routes';

export const buildApp = async () => {
  const app = Fastify({ logger: env.NODE_ENV === 'development' });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  await registerRoutes(app);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/', async () => ({ message: 'Server is running', status: 'ok', timestamp: new Date().toISOString() }));

  return app;
};

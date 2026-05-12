import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  app.server.emit('request', req, res);
}

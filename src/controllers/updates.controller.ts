import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

type Params = { clubId: string; updateId?: string };

export async function getUpdates(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const updates = await prisma.update.findMany({
    where: { clubId: req.params.clubId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return reply.send(updates);
}

export async function createUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = updateSchema.parse(req.body);
  const update = await prisma.update.create({
    data: { ...body, clubId: req.params.clubId, authorId: req.user!.userId },
  });
  return reply.status(201).send(update);
}

export async function getUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const update = await prisma.update.findUnique({
    where: { id: req.params.updateId },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!update) return reply.status(404).send({ error: 'Update not found' });
  return reply.send(update);
}

export async function updateUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = updateSchema.partial().parse(req.body);
  const update = await prisma.update.update({ where: { id: req.params.updateId }, data: body });
  return reply.send(update);
}

export async function deleteUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await prisma.update.delete({ where: { id: req.params.updateId } });
  return reply.status(204).send();
}

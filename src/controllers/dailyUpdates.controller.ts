import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { logActivity } from '../utils/activity';

const updateSchema = z.object({
  content: z.string().min(1),
  completedTasks: z.array(z.string()).default([]),
  date: z.string().datetime().optional(),
});

type Params = { clubId: string; updateId: string };

export async function getDailyUpdates(
  req: FastifyRequest<{ Params: Params; Querystring: { authorId?: string; from?: string; to?: string; page?: string } }>,
  reply: FastifyReply
) {
  const { authorId, from, to, page = '1' } = req.query;
  const take = 20;
  const skip = (parseInt(page) - 1) * take;

  const [updates, total] = await Promise.all([
    prisma.dailyUpdate.findMany({
      where: {
        clubId: req.params.clubId,
        ...(authorId ? { authorId } : {}),
        ...(from || to
          ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { date: 'desc' },
      take,
      skip,
    }),
    prisma.dailyUpdate.count({
      where: {
        clubId: req.params.clubId,
        ...(authorId ? { authorId } : {}),
      },
    }),
  ]);

  return reply.send({ updates, total, page: parseInt(page), pages: Math.ceil(total / take) });
}

export async function createDailyUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = updateSchema.parse(req.body);
  const update = await prisma.dailyUpdate.create({
    data: {
      ...body,
      clubId: req.params.clubId,
      authorId: req.user!.userId,
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  await logActivity(req.params.clubId, req.user!.userId, 'posted_daily_update', 'DailyUpdate', update.id);
  return reply.status(201).send(update);
}

export async function getDailyUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const update = await prisma.dailyUpdate.findUnique({
    where: { id: req.params.updateId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  if (!update) return reply.status(404).send({ error: 'Update not found' });
  return reply.send(update);
}

export async function updateDailyUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = updateSchema.partial().parse(req.body);
  const existing = await prisma.dailyUpdate.findUnique({ where: { id: req.params.updateId } });
  if (!existing) return reply.status(404).send({ error: 'Update not found' });
  if (existing.authorId !== req.user!.userId) return reply.status(403).send({ error: 'Forbidden' });

  const update = await prisma.dailyUpdate.update({
    where: { id: req.params.updateId },
    data: body,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return reply.send(update);
}

export async function deleteDailyUpdate(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const existing = await prisma.dailyUpdate.findUnique({ where: { id: req.params.updateId } });
  if (!existing) return reply.status(404).send({ error: 'Update not found' });
  if (existing.authorId !== req.user!.userId) return reply.status(403).send({ error: 'Forbidden' });
  await prisma.dailyUpdate.delete({ where: { id: req.params.updateId } });
  return reply.status(204).send();
}

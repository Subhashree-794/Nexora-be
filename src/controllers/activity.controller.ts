import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';

type Params = { clubId: string };

export async function getActivityLog(
  req: FastifyRequest<{ Params: Params; Querystring: { page?: string } }>,
  reply: FastifyReply
) {
  const page = parseInt(req.query.page ?? '1');
  const take = 30;
  const skip = (page - 1) * take;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { clubId: req.params.clubId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.activityLog.count({ where: { clubId: req.params.clubId } }),
  ]);

  return reply.send({ logs, total, page, pages: Math.ceil(total / take) });
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';

export async function getNotifications(req: FastifyRequest, reply: FastifyReply) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return reply.send(notifications);
}

export async function markRead(
  req: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply
) {
  await prisma.notification.update({
    where: { id: req.params.notificationId },
    data: { read: true },
  });
  return reply.send({ success: true });
}

export async function markAllRead(req: FastifyRequest, reply: FastifyReply) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });
  return reply.send({ success: true });
}

export async function getUnreadCount(req: FastifyRequest, reply: FastifyReply) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, read: false },
  });
  return reply.send({ count });
}

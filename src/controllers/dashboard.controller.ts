import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';

type Params = { clubId: string };

export async function getDashboard(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { clubId } = req.params;
  const userId = req.user!.userId;

  const [memberCount, upcomingMeetings, myTasks, recentUpdates, recentActivity, taskStats] = await Promise.all([
    prisma.clubMember.count({ where: { clubId } }),

    prisma.meeting.findMany({
      where: { clubId, scheduledAt: { gte: new Date() }, status: { not: 'CANCELLED' } },
      orderBy: { scheduledAt: 'asc' },
      take: 3,
    }),

    prisma.task.findMany({
      where: { clubId, assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] } },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 5,
    }),

    prisma.dailyUpdate.findMany({
      where: { clubId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    }),

    prisma.activityLog.findMany({
      where: { clubId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    prisma.task.groupBy({
      by: ['status'],
      where: { clubId },
      _count: { status: true },
    }),
  ]);

  return reply.send({
    memberCount,
    upcomingMeetings,
    myTasks,
    recentUpdates,
    recentActivity,
    taskStats: taskStats.map((s) => ({ status: s.status, count: s._count.status })),
  });
}

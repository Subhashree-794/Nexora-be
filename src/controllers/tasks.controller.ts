import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { logActivity } from '../utils/activity';
import { createNotification } from '../utils/notifications';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  meetingId: z.string().uuid().optional().nullable(),
});

const commentSchema = z.object({ content: z.string().min(1) });

type Params = { clubId: string; taskId: string };

export async function getTasks(req: FastifyRequest<{ Params: Params; Querystring: { status?: string; assigneeId?: string; priority?: string } }>, reply: FastifyReply) {
  const { status, assigneeId, priority } = req.query;
  const tasks = await prisma.task.findMany({
    where: {
      clubId: req.params.clubId,
      ...(status ? { status: status as any } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(priority ? { priority: priority as any } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  return reply.send(tasks);
}

export async function createTask(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = taskSchema.parse(req.body);
  const task = await prisma.task.create({
    data: {
      ...body,
      clubId: req.params.clubId,
      createdById: req.user!.userId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  await logActivity(req.params.clubId, req.user!.userId, 'created_task', 'Task', task.id, { title: task.title });

  if (task.assigneeId && task.assigneeId !== req.user!.userId) {
    await createNotification(task.assigneeId, 'TASK_ASSIGNED', 'New task assigned', `You've been assigned: ${task.title}`, `/tasks/${req.params.clubId}`);
  }

  return reply.status(201).send(task);
}

export async function getTask(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!task) return reply.status(404).send({ error: 'Task not found' });
  return reply.send(task);
}

export async function updateTask(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = taskSchema.partial().parse(req.body);

  // Fetch current for history tracking
  const current = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!current) return reply.status(404).send({ error: 'Task not found' });

  const task = await prisma.task.update({
    where: { id: req.params.taskId },
    data: { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Track history for key fields
  const trackedFields = ['status', 'priority', 'assigneeId'] as const;
  for (const field of trackedFields) {
    if (body[field] !== undefined && body[field] !== (current as any)[field]) {
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          userId: req.user!.userId,
          field,
          oldValue: String((current as any)[field] ?? ''),
          newValue: String(body[field] ?? ''),
        },
      });
    }
  }

  await logActivity(req.params.clubId, req.user!.userId, 'updated_task', 'Task', task.id, { title: task.title });

  // Notify new assignee
  if (body.assigneeId && body.assigneeId !== current.assigneeId && body.assigneeId !== req.user!.userId) {
    await createNotification(body.assigneeId, 'TASK_ASSIGNED', 'Task assigned to you', `You've been assigned: ${task.title}`, `/tasks/${req.params.clubId}`);
  }

  return reply.send(task);
}

export async function deleteTask(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  return reply.status(204).send();
}

// Comments
export async function getComments(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const comments = await prisma.taskComment.findMany({
    where: { taskId: req.params.taskId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return reply.send(comments);
}

export async function addComment(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { content } = commentSchema.parse(req.body);
  const comment = await prisma.taskComment.create({
    data: { taskId: req.params.taskId, authorId: req.user!.userId, content },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Notify task assignee
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (task?.assigneeId && task.assigneeId !== req.user!.userId) {
    await createNotification(task.assigneeId, 'TASK_COMMENT', 'New comment on your task', `${comment.author.name} commented on: ${task.title}`, `/tasks/${req.params.clubId}`);
  }

  return reply.status(201).send(comment);
}

export async function deleteComment(
  req: FastifyRequest<{ Params: Params & { commentId: string } }>,
  reply: FastifyReply
) {
  const comment = await prisma.taskComment.findUnique({ where: { id: req.params.commentId } });
  if (!comment) return reply.status(404).send({ error: 'Comment not found' });
  if (comment.authorId !== req.user!.userId) return reply.status(403).send({ error: 'Forbidden' });
  await prisma.taskComment.delete({ where: { id: req.params.commentId } });
  return reply.status(204).send();
}

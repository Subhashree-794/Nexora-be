import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { logActivity } from '../utils/activity';

const meetingSchema = z.object({
  title: z.string().min(1),
  agenda: z.string().optional(),
  scheduledAt: z.string().datetime(),
  location: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

const momSchema = z.object({
  discussionPoints: z.string().min(1),
  decisions: z.string().min(1),
  actionItems: z.string().optional(),
});

type Params = { clubId: string; meetingId: string };

export async function getMeetings(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const meetings = await prisma.meeting.findMany({
    where: { clubId: req.params.clubId },
    include: { _count: { select: { notes: true, tasks: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
  return reply.send(meetings);
}

export async function createMeeting(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = meetingSchema.parse(req.body);
  const meeting = await prisma.meeting.create({
    data: { ...body, clubId: req.params.clubId, scheduledAt: new Date(body.scheduledAt) },
  });
  await logActivity(req.params.clubId, req.user!.userId, 'created_meeting', 'Meeting', meeting.id, { title: meeting.title });
  return reply.status(201).send(meeting);
}

export async function getMeeting(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: req.params.meetingId },
    include: {
      notes: { include: { author: { select: { id: true, name: true, avatarUrl: true } } } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!meeting) return reply.status(404).send({ error: 'Meeting not found' });
  return reply.send(meeting);
}

export async function updateMeeting(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = meetingSchema.partial().parse(req.body);
  const meeting = await prisma.meeting.update({
    where: { id: req.params.meetingId },
    data: { ...body, ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}) },
  });
  await logActivity(req.params.clubId, req.user!.userId, 'updated_meeting', 'Meeting', meeting.id, { title: meeting.title });
  return reply.send(meeting);
}

export async function deleteMeeting(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await prisma.meeting.delete({ where: { id: req.params.meetingId } });
  return reply.status(204).send();
}

// MoM (Minutes of Meeting)
export async function createMoM(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const body = momSchema.parse(req.body);
  const mom = await prisma.meetingNote.create({
    data: { ...body, meetingId: req.params.meetingId, authorId: req.user!.userId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  await logActivity(req.params.clubId, req.user!.userId, 'created_mom', 'MeetingNote', mom.id);
  return reply.status(201).send(mom);
}

export async function updateMoM(
  req: FastifyRequest<{ Params: Params & { momId: string } }>,
  reply: FastifyReply
) {
  const body = momSchema.partial().parse(req.body);
  const mom = await prisma.meetingNote.update({
    where: { id: req.params.momId },
    data: body,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return reply.send(mom);
}

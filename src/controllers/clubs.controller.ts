import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { ClubRole } from '@prisma/client';
import { z } from 'zod';
import { logActivity } from '../utils/activity';

const createClubSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateClubSchema = createClubSchema.partial();

export async function getMyClubs(req: FastifyRequest, reply: FastifyReply) {
  const memberships = await prisma.clubMember.findMany({
    where: { userId: req.user!.userId },
    include: {
      club: {
        include: { _count: { select: { members: true, meetings: true, tasks: true } } },
      },
    },
  });
  return reply.send(memberships.map((m) => ({ ...m.club, role: m.role })));
}

export async function createClub(req: FastifyRequest, reply: FastifyReply) {
  const body = createClubSchema.parse(req.body);
  const club = await prisma.club.create({
    data: {
      ...body,
      members: { create: { userId: req.user!.userId, role: ClubRole.OWNER } },
    },
    include: { _count: { select: { members: true, meetings: true, tasks: true } } },
  });
  return reply.status(201).send(club);
}

export async function getClub(
  req: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const club = await prisma.club.findUnique({
    where: { id: req.params.clubId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { meetings: true, tasks: true } },
    },
  });
  if (!club) return reply.status(404).send({ error: 'Club not found' });
  return reply.send(club);
}

export async function updateClub(
  req: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const body = updateClubSchema.parse(req.body);
  const club = await prisma.club.update({ where: { id: req.params.clubId }, data: body });
  await logActivity(req.params.clubId, req.user!.userId, 'updated_club', 'Club', club.id);
  return reply.send(club);
}

export async function deleteClub(
  req: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  await prisma.club.delete({ where: { id: req.params.clubId } });
  return reply.status(204).send();
}

export async function inviteMember(
  req: FastifyRequest<{ Params: { clubId: string } }>,
  reply: FastifyReply
) {
  const { email, role } = req.body as { email: string; role?: ClubRole };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.status(404).send({ error: 'User not found' });

  const existing = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId: user.id, clubId: req.params.clubId } },
  });
  if (existing) return reply.status(409).send({ error: 'User is already a member' });

  const member = await prisma.clubMember.create({
    data: { clubId: req.params.clubId, userId: user.id, role: role ?? ClubRole.MEMBER },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
  await logActivity(
    req.params.clubId,
    req.user!.userId,
    'invited_member',
    'ClubMember',
    member.id,
    { name: user.name }
  );
  return reply.status(201).send(member);
}

export async function updateMemberRole(
  req: FastifyRequest<{ Params: { clubId: string; userId: string } }>,
  reply: FastifyReply
) {
  const { role } = req.body as { role: ClubRole };
  const member = await prisma.clubMember.update({
    where: { userId_clubId: { userId: req.params.userId, clubId: req.params.clubId } },
    data: { role },
    include: { user: { select: { id: true, name: true } } },
  });
  return reply.send(member);
}

export async function removeMember(
  req: FastifyRequest<{ Params: { clubId: string; userId: string } }>,
  reply: FastifyReply
) {
  await prisma.clubMember.delete({
    where: { userId_clubId: { userId: req.params.userId, clubId: req.params.clubId } },
  });
  return reply.status(204).send();
}

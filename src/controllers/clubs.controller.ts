import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { ClubRole, JoinRequestStatus } from '@prisma/client';
import { z } from 'zod';
import { logActivity } from '../utils/activity';
import { hashPassword } from '../utils/password';

const createClubSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateClubSchema = createClubSchema.partial();

const requestToJoinSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

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

export async function getClub(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
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

export async function updateClub(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
  const body = updateClubSchema.parse(req.body);
  const club = await prisma.club.update({ where: { id: req.params.clubId }, data: body });
  await logActivity(req.params.clubId, req.user!.userId, 'updated_club', 'Club', club.id);
  return reply.send(club);
}

export async function deleteClub(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
  await prisma.club.delete({ where: { id: req.params.clubId } });
  return reply.status(204).send();
}

export async function inviteMember(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
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
  await logActivity(req.params.clubId, req.user!.userId, 'invited_member', 'ClubMember', member.id, { name: user.name });
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

export async function getAllPublicClubs(req: FastifyRequest, reply: FastifyReply) {
  const clubs = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      _count: { select: { members: true } }
    }
  });
  return reply.send(clubs);
}

export async function requestToJoin(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
  const parsed = requestToJoinSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
  }

  const { name, email, password } = parsed.data;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const isMember = await prisma.clubMember.findUnique({ where: { userId_clubId: { userId: user.id, clubId: req.params.clubId } } });
    if (isMember) return reply.status(409).send({ error: 'Already a member of this club' });
  }

  const existingReq = await prisma.joinRequest.findUnique({ where: { email_clubId: { email, clubId: req.params.clubId } } });
  if (existingReq) {
    if (existingReq.status === 'PENDING') return reply.status(409).send({ error: 'Join request already pending' });
    if (existingReq.status === 'APPROVED') return reply.status(409).send({ error: 'Join request already approved' });
  }

  const passwordHash = await hashPassword(password);

  const joinReq = await prisma.joinRequest.upsert({
    where: { email_clubId: { email, clubId: req.params.clubId } },
    update: { name, passwordHash, status: 'PENDING' },
    create: { clubId: req.params.clubId, name, email, passwordHash, status: 'PENDING' }
  });

  return reply.status(201).send({ message: 'Request submitted successfully', id: joinReq.id });
}

export async function getJoinRequests(req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) {
  const requests = await prisma.joinRequest.findMany({
    where: { clubId: req.params.clubId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  });
  return reply.send(requests);
}

export async function approveJoinRequest(req: FastifyRequest<{ Params: { clubId: string, requestId: string } }>, reply: FastifyReply) {
  const joinReq = await prisma.joinRequest.findUnique({ where: { id: req.params.requestId } });
  if (!joinReq || joinReq.clubId !== req.params.clubId) return reply.status(404).send({ error: 'Request not found' });
  
  if (joinReq.status !== 'PENDING') return reply.status(400).send({ error: 'Request is not pending' });

  let user = await prisma.user.findUnique({ where: { email: joinReq.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: joinReq.email, name: joinReq.name, passwordHash: joinReq.passwordHash }
    });
  }

  await prisma.clubMember.upsert({
    where: { userId_clubId: { userId: user.id, clubId: req.params.clubId } },
    update: {},
    create: { userId: user.id, clubId: req.params.clubId, role: ClubRole.MEMBER }
  });

  await prisma.joinRequest.update({
    where: { id: joinReq.id },
    data: { status: 'APPROVED' }
  });

  await logActivity(req.params.clubId, req.user!.userId, 'approved_join_request', 'JoinRequest', joinReq.id, { email: joinReq.email });

  return reply.send({ message: 'Approved successfully' });
}

export async function rejectJoinRequest(req: FastifyRequest<{ Params: { clubId: string, requestId: string } }>, reply: FastifyReply) {
  const joinReq = await prisma.joinRequest.findUnique({ where: { id: req.params.requestId } });
  if (!joinReq || joinReq.clubId !== req.params.clubId) return reply.status(404).send({ error: 'Request not found' });

  await prisma.joinRequest.update({
    where: { id: joinReq.id },
    data: { status: 'REJECTED' }
  });

  await logActivity(req.params.clubId, req.user!.userId, 'rejected_join_request', 'JoinRequest', joinReq.id, { email: joinReq.email });

  return reply.send({ message: 'Rejected successfully' });
}


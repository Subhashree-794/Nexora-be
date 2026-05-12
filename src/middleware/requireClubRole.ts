import { FastifyRequest, FastifyReply } from 'fastify';
import { ClubRole } from '@prisma/client';
import { prisma } from '../config/prisma';

const roleHierarchy: Record<ClubRole, number> = {
  MEMBER: 0,
  CORE_MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function requireClubRole(minRole: ClubRole) {
  return async (req: FastifyRequest<{ Params: { clubId: string } }>, reply: FastifyReply) => {
    const { userId } = req.user!;
    const { clubId } = req.params;

    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a member of this club' });
    }

    if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    req.clubMember = membership;
  };
}

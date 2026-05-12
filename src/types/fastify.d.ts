import { JwtPayload } from '../utils/jwt';
import { ClubMember } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    clubMember?: ClubMember;
  }
}

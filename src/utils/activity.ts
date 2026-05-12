import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export async function logActivity(
  clubId: string,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>
) {
  try {
    await prisma.activityLog.create({
      data: {
        clubId,
        userId,
        action,
        entity,
        entityId,
        meta: (meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-critical — don't throw
  }
}

import { prisma } from '../config/prisma';

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
      data: { clubId, userId, action, entity, entityId, meta: meta ?? {} },
    });
  } catch {
    // Non-critical — don't throw
  }
}

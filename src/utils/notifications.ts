import { prisma } from '../config/prisma';
import { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch {
    // Non-critical
  }
}

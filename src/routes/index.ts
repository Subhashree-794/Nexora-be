import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { requireClubRole } from '../middleware/requireClubRole';
import { ClubRole } from '@prisma/client';

import * as auth from '../controllers/auth.controller';
import * as clubs from '../controllers/clubs.controller';
import * as meetings from '../controllers/meetings.controller';
import * as tasks from '../controllers/tasks.controller';
import * as dailyUpdates from '../controllers/dailyUpdates.controller';
import * as notes from '../controllers/notes.controller';
import * as dashboard from '../controllers/dashboard.controller';
import * as notifications from '../controllers/notifications.controller';
import * as activity from '../controllers/activity.controller';

export async function registerRoutes(app: FastifyInstance) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post('/api/auth/register', auth.register as any);
  app.post('/api/auth/login', auth.login as any);
  app.post('/api/auth/refresh', auth.refresh as any);
  app.post('/api/auth/logout', auth.logout as any);
  app.get('/api/auth/me', { preHandler: [authenticate] }, auth.getMe as any);

  // ── Clubs ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs', { preHandler: [authenticate] }, clubs.getMyClubs as any);
  app.post('/api/clubs', { preHandler: [authenticate] }, clubs.createClub as any);
  app.get('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, clubs.getClub as any);
  app.patch('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.updateClub as any);
  app.delete('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.OWNER)] }, clubs.deleteClub as any);
  app.post('/api/clubs/:clubId/members', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.inviteMember as any);
  app.patch('/api/clubs/:clubId/members/:userId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.updateMemberRole as any);
  app.delete('/api/clubs/:clubId/members/:userId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.removeMember as any);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/dashboard', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dashboard.getDashboard as any);

  // ── Activity Log ──────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/activity', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, activity.getActivityLog as any);

  // ── Meetings ──────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/meetings', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, meetings.getMeetings as any);
  app.post('/api/clubs/:clubId/meetings', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.createMeeting as any);
  app.get('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, meetings.getMeeting as any);
  app.patch('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.updateMeeting as any);
  app.delete('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.deleteMeeting as any);
  app.post('/api/clubs/:clubId/meetings/:meetingId/mom', { preHandler: [authenticate, requireClubRole(ClubRole.CORE_MEMBER)] }, meetings.createMoM as any);
  app.patch('/api/clubs/:clubId/meetings/:meetingId/mom/:momId', { preHandler: [authenticate, requireClubRole(ClubRole.CORE_MEMBER)] }, meetings.updateMoM as any);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/tasks', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getTasks as any);
  app.post('/api/clubs/:clubId/tasks', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.createTask as any);
  app.get('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getTask as any);
  app.patch('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.updateTask as any);
  app.delete('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, tasks.deleteTask as any);
  app.get('/api/clubs/:clubId/tasks/:taskId/comments', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getComments as any);
  app.post('/api/clubs/:clubId/tasks/:taskId/comments', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.addComment as any);
  app.delete('/api/clubs/:clubId/tasks/:taskId/comments/:commentId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.deleteComment as any);

  // ── Daily Updates ─────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/updates', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.getDailyUpdates as any);
  app.post('/api/clubs/:clubId/updates', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.createDailyUpdate as any);
  app.get('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.getDailyUpdate as any);
  app.patch('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.updateDailyUpdate as any);
  app.delete('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.deleteDailyUpdate as any);

  // ── Notes ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/notes', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.getNotes as any);
  app.post('/api/clubs/:clubId/notes', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.createNote as any);
  app.get('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.getNote as any);
  app.patch('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.updateNote as any);
  app.delete('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.deleteNote as any);
  app.get('/api/tags', { preHandler: [authenticate] }, notes.getTags as any);
  app.post('/api/tags', { preHandler: [authenticate] }, notes.createTag as any);

  // ── Notifications ─────────────────────────────────────────────────────────
  app.get('/api/notifications', { preHandler: [authenticate] }, notifications.getNotifications as any);
  app.get('/api/notifications/unread-count', { preHandler: [authenticate] }, notifications.getUnreadCount as any);
  app.patch('/api/notifications/read-all', { preHandler: [authenticate] }, notifications.markAllRead as any);
  // notificationId param — typed via RouteGenericInterface
  app.patch<{ Params: { notificationId: string } }>(
    '/api/notifications/:notificationId/read',
    { preHandler: [authenticate] },
    notifications.markRead
  );
}

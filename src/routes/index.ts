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
  app.post('/api/auth/register', auth.register);
  app.post('/api/auth/login', auth.login);
  app.post('/api/auth/refresh', auth.refresh);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/auth/me', { preHandler: [authenticate] }, auth.getMe);

  // ── Clubs ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs', { preHandler: [authenticate] }, clubs.getMyClubs);
  app.post('/api/clubs', { preHandler: [authenticate] }, clubs.createClub);
  app.get('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, clubs.getClub);
  app.patch('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.updateClub);
  app.delete('/api/clubs/:clubId', { preHandler: [authenticate, requireClubRole(ClubRole.OWNER)] }, clubs.deleteClub);
  app.post('/api/clubs/:clubId/members', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.inviteMember);
  app.patch('/api/clubs/:clubId/members/:userId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.updateMemberRole);
  app.delete('/api/clubs/:clubId/members/:userId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, clubs.removeMember);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/dashboard', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dashboard.getDashboard);

  // ── Activity Log ──────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/activity', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, activity.getActivityLog);

  // ── Meetings ──────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/meetings', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, meetings.getMeetings);
  app.post('/api/clubs/:clubId/meetings', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.createMeeting);
  app.get('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, meetings.getMeeting);
  app.patch('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.updateMeeting);
  app.delete('/api/clubs/:clubId/meetings/:meetingId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, meetings.deleteMeeting);
  app.post('/api/clubs/:clubId/meetings/:meetingId/mom', { preHandler: [authenticate, requireClubRole(ClubRole.CORE_MEMBER)] }, meetings.createMoM);
  app.patch('/api/clubs/:clubId/meetings/:meetingId/mom/:momId', { preHandler: [authenticate, requireClubRole(ClubRole.CORE_MEMBER)] }, meetings.updateMoM);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/tasks', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getTasks);
  app.post('/api/clubs/:clubId/tasks', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.createTask);
  app.get('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getTask);
  app.patch('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.updateTask);
  app.delete('/api/clubs/:clubId/tasks/:taskId', { preHandler: [authenticate, requireClubRole(ClubRole.ADMIN)] }, tasks.deleteTask);
  app.get('/api/clubs/:clubId/tasks/:taskId/comments', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.getComments);
  app.post('/api/clubs/:clubId/tasks/:taskId/comments', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.addComment);
  app.delete('/api/clubs/:clubId/tasks/:taskId/comments/:commentId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, tasks.deleteComment);

  // ── Daily Updates ─────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/updates', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.getDailyUpdates);
  app.post('/api/clubs/:clubId/updates', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.createDailyUpdate);
  app.get('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.getDailyUpdate);
  app.patch('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.updateDailyUpdate);
  app.delete('/api/clubs/:clubId/updates/:updateId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, dailyUpdates.deleteDailyUpdate);

  // ── Notes ─────────────────────────────────────────────────────────────────
  app.get('/api/clubs/:clubId/notes', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.getNotes);
  app.post('/api/clubs/:clubId/notes', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.createNote);
  app.get('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.getNote);
  app.patch('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.updateNote);
  app.delete('/api/clubs/:clubId/notes/:noteId', { preHandler: [authenticate, requireClubRole(ClubRole.MEMBER)] }, notes.deleteNote);
  app.get('/api/tags', { preHandler: [authenticate] }, notes.getTags);
  app.post('/api/tags', { preHandler: [authenticate] }, notes.createTag);

  // ── Notifications ─────────────────────────────────────────────────────────
  app.get('/api/notifications', { preHandler: [authenticate] }, notifications.getNotifications);
  app.get('/api/notifications/unread-count', { preHandler: [authenticate] }, notifications.getUnreadCount);
  app.patch('/api/notifications/read-all', { preHandler: [authenticate] }, notifications.markAllRead);
  // notificationId param — typed via RouteGenericInterface
  app.patch<{ Params: { notificationId: string } }>(
    '/api/notifications/:notificationId/read',
    { preHandler: [authenticate] },
    notifications.markRead
  );
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import { logActivity } from '../utils/activity';

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  isPinned: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
});

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

type Params = { clubId: string; noteId: string };

export async function getNotes(
  req: FastifyRequest<{ Params: Params; Querystring: { search?: string; tagId?: string } }>,
  reply: FastifyReply
) {
  const { search, tagId } = req.query;
  const notes = await prisma.note.findMany({
    where: {
      clubId: req.params.clubId,
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }] } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  });
  return reply.send(notes);
}

export async function createNote(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { tagIds, ...body } = noteSchema.parse(req.body);
  const note = await prisma.note.create({
    data: {
      ...body,
      clubId: req.params.clubId,
      authorId: req.user!.userId,
      ...(tagIds?.length ? { tags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    },
  });
  await logActivity(req.params.clubId, req.user!.userId, 'created_note', 'Note', note.id, { title: note.title });
  return reply.status(201).send(note);
}

export async function getNote(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const note = await prisma.note.findUnique({
    where: { id: req.params.noteId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!note) return reply.status(404).send({ error: 'Note not found' });
  return reply.send(note);
}

export async function updateNote(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { tagIds, ...body } = noteSchema.partial().parse(req.body);

  const note = await prisma.note.update({
    where: { id: req.params.noteId },
    data: {
      ...body,
      ...(tagIds !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    },
  });
  return reply.send(note);
}

export async function deleteNote(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await prisma.note.delete({ where: { id: req.params.noteId } });
  return reply.status(204).send();
}

// Tags
export async function getTags(req: FastifyRequest, reply: FastifyReply) {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  return reply.send(tags);
}

export async function createTag(req: FastifyRequest, reply: FastifyReply) {
  const body = tagSchema.parse(req.body);
  const tag = await prisma.tag.create({ data: body });
  return reply.status(201).send(tag);
}

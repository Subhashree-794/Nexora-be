import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function register(req: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return reply.status(409).send({ error: 'Email already in use' });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  return reply.status(201).send({ user, accessToken, refreshToken });
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const { passwordHash: _, ...safeUser } = user;
  return reply.send({ user: safeUser, accessToken, refreshToken });
}

export async function refresh(req: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) return reply.status(400).send({ error: 'Refresh token required' });

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    return reply.status(401).send({ error: 'Invalid or expired refresh token' });
  }

  let payload: { userId: string; email: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return reply.status(401).send({ error: 'Invalid refresh token' });
  }

  const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
  return reply.send({ accessToken });
}

export async function logout(req: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  return reply.send({ message: 'Logged out' });
}

export async function getMe(req: FastifyRequest, reply: FastifyReply) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
  });
  if (!user) return reply.status(404).send({ error: 'User not found' });
  return reply.send(user);
}

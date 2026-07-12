import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';

/** Durée de vie d'une session. Pas de "remember me" séparé : usage interne, peu d'utilisateurs. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(userId: number) {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  return { id, expiresAt };
}

/** Renvoie la session + l'utilisateur si le token est valide et non expiré, sinon null.
 *  Purge la session expirée au passage. */
export async function validateSession(id: string) {
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return session;
}

export async function deleteSession(id: string) {
  await prisma.session.delete({ where: { id } }).catch(() => {});
}

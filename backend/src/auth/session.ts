import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../db.js';

/** Durée de vie d'une session. Pas de "remember me" séparé : usage interne, peu d'utilisateurs. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}

/** Le token brut n'est jamais stocké : seule son empreinte sha256 vit en base
 *  (colonne Session.id). Si la base fuit, les tokens de session ne sont pas
 *  directement réutilisables — même logique que pour un mot de passe, en plus
 *  léger (pas besoin de sel/coût ici : le token est déjà 256 bits d'aléatoire). */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: number) {
  const token = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  // Le token brut n'est retourné qu'ici, une seule fois, pour être remis au client.
  return { id: token, expiresAt };
}

/** Renvoie la session + l'utilisateur si le token est valide et non expiré, sinon null.
 *  Purge la session expirée au passage. */
export async function validateSession(token: string) {
  const hashed = hashToken(token);
  const session = await prisma.session.findUnique({ where: { id: hashed }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: hashed } }).catch(() => {});
    return null;
  }
  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
}

/**
 * Client API — les loaders SvelteKit tournent côté serveur du conteneur
 * frontend et parlent au backend via le réseau Docker (API_URL=http://backend:3001).
 * En dev local : API_URL=http://localhost:3001.
 *
 * Le backend exige un token de session (Authorization: Bearer <token>) sur
 * toutes les routes /api/* sauf /api/auth/login. Le token vit dans le cookie
 * "session" côté frontend (voir hooks.server.ts) et doit être transmis
 * explicitement à chaque appel via le paramètre `token`.
 */
import { env } from '$env/dynamic/private';

export const API_BASE = env.API_URL ?? 'http://localhost:3001';

export async function api<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} sur ${path} : ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

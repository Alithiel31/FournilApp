/**
 * Client API — les loaders SvelteKit tournent côté serveur du conteneur
 * frontend et parlent au backend via le réseau Docker (API_URL=http://backend:3001).
 * En dev local : API_URL=http://localhost:3001.
 */
import { env } from '$env/dynamic/private';

const BASE = env.API_URL ?? 'http://localhost:3001';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} sur ${path} : ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

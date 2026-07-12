import { redirect, type Handle } from '@sveltejs/kit';
import { API_BASE } from '$lib/api';

/** Routes accessibles sans session. */
const PUBLIC_PATHS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  let user: App.Locals['user'] = null;

  if (token) {
    try {
      const res = await event.fetch(`${API_BASE}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        user = await res.json();
      } else {
        event.cookies.delete('session', { path: '/' });
      }
    } catch {
      // backend indisponible : on traite comme non connecté, sans effacer le cookie
      // (évite de déconnecter tout le monde pendant un redémarrage du backend)
    }
  }

  event.locals.user = user;

  const isPublic = PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p));

  if (!user && !isPublic) {
    throw redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
  }
  if (user && event.url.pathname.startsWith('/login')) {
    throw redirect(303, '/');
  }

  return resolve(event);
};

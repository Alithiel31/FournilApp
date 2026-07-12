import { redirect } from '@sveltejs/kit';
import { API_BASE } from '$lib/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session');
  cookies.delete('session', { path: '/' });

  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      // best effort : le cookie local est de toute façon supprimé
    }
  }

  throw redirect(303, '/login');
};

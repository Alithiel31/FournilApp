import { fail, redirect } from '@sveltejs/kit';
import { API_BASE } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email et mot de passe requis.' });
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return fail(502, { error: 'API indisponible.' });
    }

    if (!res.ok) {
      return fail(401, { error: 'Identifiants invalides.' });
    }

    const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: string };
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      expires: new Date(expiresAt),
    });

    const next = url.searchParams.get('next');
    throw redirect(303, next && next.startsWith('/') ? next : '/');
  },
};

import { api } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    return await api<{ jour: string; jours: string[]; fiches: any[] }>(
      `/api/production/${params.jour.toLowerCase()}`
    );
  } catch (e) {
    throw error(404, e instanceof Error ? e.message : 'Jour inconnu');
  }
};

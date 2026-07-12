import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  recettes: await api<any[]>('/api/recettes')
});

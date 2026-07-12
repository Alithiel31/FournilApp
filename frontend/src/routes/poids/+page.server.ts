import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  produits: await api<any[]>('/api/poids')
});

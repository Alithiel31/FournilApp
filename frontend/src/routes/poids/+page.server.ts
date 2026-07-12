import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

interface ProduitPoids {
  id: number;
  nom: string;
  poidsPate: number | null;
  garniture: number;
}

export const load: PageServerLoad = async () => ({
  produits: await api<ProduitPoids[]>('/api/poids'),
});

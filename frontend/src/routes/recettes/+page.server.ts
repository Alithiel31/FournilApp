import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

interface LigneRecette {
  ingredient: string;
  quantite: number;
  arrondi: number;
}

interface Recette {
  id: number;
  base: number;
  pate: { nom: string };
  lignes: LigneRecette[];
}

export const load: PageServerLoad = async () => ({
  recettes: await api<Recette[]>('/api/recettes'),
});

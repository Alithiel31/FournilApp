import { api } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface FicheDetail {
  nom: string;
  quantite: number;
  totalPate: number;
}

interface FichePesee {
  ingredient: string;
  grammes: number;
}

interface FichePate {
  pate: string;
  totalPate: number;
  coef: number | null;
  detail: FicheDetail[];
  pesee: FichePesee[];
}

export const load: PageServerLoad = async ({ params }) => {
  try {
    return await api<{ jour: string; jours: string[]; fiches: FichePate[] }>(
      `/api/production/${params.jour.toLowerCase()}`
    );
  } catch (e) {
    throw error(404, e instanceof Error ? e.message : 'Jour inconnu');
  }
};

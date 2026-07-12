/**
 * Logique métier de production — calculs runtime de l'app.
 * (Le moteur de formules ne sert qu'à valider l'import.)
 */

import { ceilTo } from '../engine/engine.js';

export interface ProduitJour {
  id: number;
  nom: string;
  pate: string;
  quantite: number;
  poidsPate: number;
}

export interface LigneRecette {
  ingredient: string;
  quantite: number;
  arrondi: number;
}

export interface FichePate {
  pate: string;
  totalPate: number; // g de pâte à produire
  coef: number | null; // totalPate / base recette
  detail: { nom: string; quantite: number; totalPate: number }[];
  pesee: { ingredient: string; grammes: number }[];
}

/** Regroupe les commandes d'un jour par pâte et met les recettes à l'échelle. */
export function fichesDuJour(
  produits: ProduitJour[],
  recettes: Map<string, { base: number; lignes: LigneRecette[] }>
): FichePate[] {
  const parPate = new Map<string, ProduitJour[]>();
  for (const p of produits) {
    if (!p.quantite || !p.poidsPate) continue;
    const list = parPate.get(p.pate) ?? [];
    list.push(p);
    parPate.set(p.pate, list);
  }

  const fiches: FichePate[] = [];
  for (const [pate, ps] of parPate) {
    const totalPate = ps.reduce((a, p) => a + p.quantite * p.poidsPate, 0);
    const rec = recettes.get(pate);
    const coef = rec ? totalPate / rec.base : null;
    fiches.push({
      pate,
      totalPate,
      coef,
      detail: ps.map((p) => ({
        nom: p.nom,
        quantite: p.quantite,
        totalPate: p.quantite * p.poidsPate,
      })),
      pesee:
        rec && coef !== null
          ? rec.lignes.map((l) => ({
              ingredient: l.ingredient,
              grammes: ceilTo(l.quantite * coef, l.arrondi),
            }))
          : [],
    });
  }
  return fiches;
}

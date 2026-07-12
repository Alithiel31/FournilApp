/**
 * Applique un ImportModel à la base : transaction unique qui remplace
 * le référentiel (pâtes, recettes, produits, poids) et pose les commandes.
 */
import { prisma } from '../db.js';
import { arrondiFor, type ImportModel, type ValidationResult } from '../import/extract.js';

export async function applyImport(
  model: ImportModel,
  fileName: string,
  validation: ValidationResult,
  importedById: number
) {
  return prisma.$transaction(async (tx) => {
    await tx.commande.deleteMany();
    await tx.recetteLigne.deleteMany();
    await tx.recette.deleteMany();
    await tx.produit.deleteMany();
    await tx.pate.deleteMany();

    const pates = new Map<string, number>();
    const nomsPates = [
      ...new Set(model.produits.map((p) => p.pate).filter((x): x is string => !!x)),
    ];
    for (const [i, nom] of nomsPates.entries()) {
      const pate = await tx.pate.create({ data: { nom, ordre: i } });
      pates.set(nom, pate.id);
    }

    for (const r of model.recettes) {
      const pateId = pates.get(r.pate);
      if (!pateId) continue;
      await tx.recette.create({
        data: {
          pateId,
          base: r.base,
          feuille: r.feuille,
          lignes: {
            create: r.lignes.map((l, i) => ({
              ingredient: l.ingredient,
              quantite: l.quantite,
              arrondi: l.arrondi ?? arrondiFor(l.ingredient),
              ordre: i,
            })),
          },
        },
      });
    }

    for (const [i, p] of model.produits.entries()) {
      const pateId = p.pate ? pates.get(p.pate) : undefined;
      if (!pateId) continue;
      const produit = await tx.produit.create({
        data: { nom: p.nom, pateId, poidsPate: p.poidsPate, garniture: p.garniture, ordre: i },
      });
      await tx.commande.createMany({
        data: p.qte.map((quantite, jour) => ({ produitId: produit.id, jour, quantite })),
      });
    }

    return tx.import.create({
      data: { fileName, rapport: { ...model.report, validation } as object, importedById },
    });
  });
}

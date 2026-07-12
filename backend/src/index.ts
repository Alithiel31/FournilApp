/**
 * API Fournil — Express + Node.js.
 *
 * Routes :
 *   GET  /health                    — sonde de vie (Coolify)
 *   POST /api/import                — injection d'un classeur xlsx (multipart, champ "file")
 *   GET  /api/imports               — historique des injections (rapports)
 *   GET  /api/commandes             — pâtes → produits → quantités par jour
 *   PUT  /api/commandes             — { produitId, jour, quantite }
 *   GET  /api/production/:jour      — fiches du jour (regroupées par pâte, pesées arrondies)
 *   GET  /api/recettes              — recettes en lecture seule
 *   GET  /api/poids                 — poids unitaires + produits non rapprochés
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from './db';
import { extractModel, validateImport } from './import/extract';
import { applyImport } from './services/importer';
import { fichesDuJour } from './domain/production';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json());

// multer en mémoire : le xlsx est lu directement depuis le buffer, jamais écrit sur disque
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/** Enveloppe les handlers async pour propager les erreurs au middleware d'erreur
 *  (Express 4 ne le fait pas tout seul, contrairement à Express 5). */
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

/* ---------------- Santé ---------------- */

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/* ---------------- Import ---------------- */

app.post(
  '/api/import',
  upload.single('file'),
  wrap(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier manquant (champ "file")' });
      return;
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellFormula: true });

    const model = extractModel(wb);
    const validation = validateImport(wb);

    // garde-fou : si le moteur ne reproduit pas les valeurs Excel, on refuse
    const ratio = validation.evaluated ? validation.matches / validation.evaluated : 1;
    if (ratio < 0.95) {
      res.status(422).json({
        error: `Validation échouée : ${validation.matches}/${validation.evaluated} formules reproduites. Classeur inattendu ?`,
        validation
      });
      return;
    }

    const imported = await applyImport(model, req.file.originalname, validation);
    res.json({ importId: imported.id, report: model.report, validation });
  })
);

app.get(
  '/api/imports',
  wrap(async (_req, res) => {
    res.json(await prisma.import.findMany({ orderBy: { importedAt: 'desc' }, take: 20 }));
  })
);

/* ---------------- Commandes ---------------- */

app.get(
  '/api/commandes',
  wrap(async (_req, res) => {
    res.json(
      await prisma.pate.findMany({
        orderBy: { ordre: 'asc' },
        include: {
          produits: { orderBy: { ordre: 'asc' }, include: { commandes: true } }
        }
      })
    );
  })
);

app.put(
  '/api/commandes',
  wrap(async (req, res) => {
    const { produitId, jour, quantite } = (req.body ?? {}) as {
      produitId?: unknown;
      jour?: unknown;
      quantite?: unknown;
    };
    if (
      !Number.isInteger(produitId) ||
      !Number.isInteger(jour) || (jour as number) < 0 || (jour as number) > 6 ||
      typeof quantite !== 'number' || quantite < 0
    ) {
      res.status(400).json({ error: 'produitId, jour (0-6) et quantite (≥0) requis' });
      return;
    }
    res.json(
      await prisma.commande.upsert({
        where: { produitId_jour: { produitId: produitId as number, jour: jour as number } },
        update: { quantite },
        create: { produitId: produitId as number, jour: jour as number, quantite }
      })
    );
  })
);

/* ---------------- Production ---------------- */

app.get(
  '/api/production/:jour',
  wrap(async (req, res) => {
    const jour = JOURS.indexOf(String(req.params.jour).toLowerCase());
    if (jour < 0) {
      res.status(404).json({ error: 'Jour inconnu' });
      return;
    }

    const produits = await prisma.produit.findMany({
      include: { pate: true, commandes: { where: { jour } } }
    });
    const recettes = await prisma.recette.findMany({
      include: { pate: true, lignes: { orderBy: { ordre: 'asc' } } }
    });

    const fiches = fichesDuJour(
      produits.map((p) => ({
        id: p.id,
        nom: p.nom,
        pate: p.pate.nom,
        quantite: p.commandes[0]?.quantite ?? 0,
        poidsPate: p.poidsPate ?? 0
      })),
      new Map(recettes.map((r) => [r.pate.nom, { base: r.base, lignes: r.lignes }]))
    );

    res.json({ jour: req.params.jour, jours: JOURS, fiches });
  })
);

/* ---------------- Référentiels lecture seule ---------------- */

app.get(
  '/api/recettes',
  wrap(async (_req, res) => {
    res.json(
      await prisma.recette.findMany({
        include: { pate: true, lignes: { orderBy: { ordre: 'asc' } } },
        orderBy: { pate: { ordre: 'asc' } }
      })
    );
  })
);

app.get(
  '/api/poids',
  wrap(async (_req, res) => {
    res.json(await prisma.produit.findMany({ orderBy: { ordre: 'asc' }, include: { pate: true } }));
  })
);

/* ---------------- Gestion d'erreurs ---------------- */

// 404 par défaut
app.use((_req, res) => {
  res.status(404).json({ error: 'Route inconnue' });
});

// erreurs non attrapées (y compris celles remontées par wrap et multer)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erreur interne' });
});

/* ---------------- Démarrage ---------------- */

const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`API Fournil prête sur :${port}`);
});

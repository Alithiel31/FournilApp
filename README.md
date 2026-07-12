# Le Fournil — architecture

Application PWA de gestion de production pour fournil, **pilotée par injection de tableur Excel**.
Le classeur (commandes × jours, recettes, poids de pâtons) est le format d'import ;
PostgreSQL est la source de vérité applicative.

## Architecture : backend / frontend séparés

```
fournil/
├── docker-compose.yml          # orchestration : db + backend + frontend
├── backend/                    # API Express + Prisma  (port 3001)
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts            # routes API (Express + multer)
│       ├── db.ts               # client Prisma
│       ├── engine/             # moteur de formules Excel (TS pur)
│       │   ├── engine.ts       #   tokenizer + parseur + évaluateur
│       │   └── engine.test.ts  #   Vitest — 5 tests verts
│       ├── import/extract.ts   # extractModel + fuzzyFind + validateImport
│       ├── services/importer.ts# transaction de remplacement du référentiel
│       └── domain/production.ts# fiches du jour : regroupement, coef, pesées
└── frontend/                   # SvelteKit (Svelte 5) PWA  (port 3000)
    ├── Dockerfile
    ├── vite.config.ts          # @vite-pwa/sveltekit : manifest + offline
    └── src/
        ├── lib/api.ts          # client API (API_URL, réseau Docker)
        └── routes/
            ├── +layout.svelte          # navigation basse 4 onglets
            ├── commandes/              # SEULE zone d'écriture (PUT /api/commandes)
            ├── production/[jour]/      # fiches + checklist de pesée
            ├── recettes/  ·  poids/    # référentiels lecture seule
            └── +page.server.ts         # redirection → /production/lundi
```

```
 classeur .xlsx ──▶ POST /api/import ──▶ extractModel ──▶ validateImport ──▶ applyImport
                    (multipart)          (référentiel)    (moteur rejoue     (transaction
                                                           les formules,      Prisma)
                                                           ≥95 % sinon 422)
                                                                 │
 frontend SvelteKit ◀── GET /api/commandes|production|recettes|poids ◀── PostgreSQL
 (loaders serveur, API_URL=http://backend:3001 sur le réseau Docker)
```

**Décision clé** : le moteur de formules (`backend/src/engine`) n'est PAS utilisé au
runtime. Il sert de **validateur d'import** — à chaque injection, il exécute les
formules réelles du classeur et vérifie que l'extraction est cohérente. Les calculs
de l'app vivent dans `backend/src/domain` en TypeScript testé. Résultat mesuré sur
le classeur de référence : **788/788 formules numériques reproduites (100 %),
0 erreur de parsing**.

## API

| Méthode | Route                  | Rôle                                            |
|--------:|------------------------|-------------------------------------------------|
| GET     | `/health`              | sonde de vie (Coolify)                          |
| POST    | `/api/import`          | injection xlsx (multipart, champ `file`)        |
| GET     | `/api/imports`         | historique des injections + rapports            |
| GET     | `/api/commandes`       | pâtes → produits → quantités par jour           |
| PUT     | `/api/commandes`       | `{ produitId, jour, quantite }`                 |
| GET     | `/api/production/:jour`| fiches du jour (pâtes, coef, pesées arrondies)  |
| GET     | `/api/recettes`        | recettes (lecture seule)                        |
| GET     | `/api/poids`           | poids unitaires + produits non rapprochés       |

## Pipeline d'import — détails

1. **Feuille Commandes** : détection de la ligne d'en-tête par présence d'au moins
   3 noms de jours. Ligne texte sans quantités = **section** (la pâte), ligne texte
   + quantités = **produit** rattaché à la section courante.
2. **Poids unitaires** : feuille reconnue par son nom, colonne « gr ss ing »
   privilégiée sur « gr à l'unité » (la pâte seule sert au coefficient).
3. **Recettes** : une feuille par section, rapprochée par nom flou (gère « Maïs »
   avec espace final). Ingrédients lus jusqu'à la ligne « Total » = base.
4. **Rapprochement flou** (`normalize` + `fuzzyFind`) : accents, articles, pluriels,
   comparaison par jetons. « Baguette au Levain » ↔ « Baguette levain » ✓.
5. **Validation croisée** puis **transaction** de remplacement complet du référentiel.

Constat sur le classeur réel : une section « Divers » (Burger, Hot-dog, Carré au
lait…) sans feuille recette ni poids — le rapport d'import remonte ces cas en ⚠.

## Arrondis de pesée

Heuristique par ingrédient (`arrondiFor`) : sel → 20 g, levure → 5 g, reste → 50 g.
Stockée par ligne de recette (`RecetteLigne.arrondi`), ajustable en base sans
réimport. Piste v2 : lire les pas exacts des `CEILING(...)` du classeur à l'import.

## PWA

- `@vite-pwa/sveltekit`, `registerType: autoUpdate`
- Manifest : standalone, portrait, thème `#C4771C`
- Offline : precache du shell + `StaleWhileRevalidate` sur les référentiels
- Icônes à générer dans `frontend/static/`
- Publication Play Store possible via TWA/PWABuilder (pipeline QCWeather)

## Démarrage

```bash
# tout-en-un
docker compose up --build
# frontend → http://localhost:3000 · API → http://localhost:3001

# ou en dev, terminal 1 (API) :
cd backend && cp .env.example .env && npm install
npx prisma migrate dev --name init && npm run dev

# terminal 2 (front) :
cd frontend && npm install && API_URL=http://localhost:3001 npm run dev

# tests du moteur
cd backend && npm test
```

## Déploiement (Caesura / Coolify)

- **Deux applications Coolify distinctes** : `backend/` et `frontend/`, chacune
  buildée par son Dockerfile — cycles de déploiement indépendants.
- Backend : `DATABASE_URL` → PostgreSQL natif de Caesura (port 5433, via Tailscale),
  les migrations s'appliquent au démarrage (`migrate deploy`).
- Frontend : `API_URL` → URL interne du backend.
- Exposition publique du frontend par Cloudflare Tunnel ; l'API peut rester
  interne au réseau (le frontend lui parle côté serveur).

## Feuille de route

- [ ] Auth (sessions cookie côté API, argon2), rôles boulanger/admin
- [ ] Page d'import côté front avec affichage du rapport et de la validation
- [ ] Lecture des pas d'arrondi exacts depuis les `CEILING` du classeur
- [ ] Export xlsx (trajet inverse : base → classeur)
- [ ] Historique des commandes par semaine (champ `semaine` sur `Commande`)
- [ ] Couche IA (optionnelle) : classification automatique des feuilles d'un classeur inconnu

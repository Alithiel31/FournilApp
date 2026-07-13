# 🥖 Le Fournil

[![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange?logo=svelte)](https://svelte.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)](https://www.docker.com/)
[![Déployé](https://img.shields.io/badge/Déployé-fournilapp.alithiel31.dev-blue)](https://fournilapp.alithiel31.dev)
[![Cloudflare](https://img.shields.io/badge/Tunnel-Cloudflare-orange?logo=cloudflare)](https://www.cloudflare.com/)

Application PWA de gestion de production pour fournil, **pilotée par injection de tableur Excel**.
Backend **Express / TypeScript / Prisma** + frontend **SvelteKit (Svelte 5) PWA**.
Le classeur (commandes × jours, recettes, poids de pâtons) est le format d'import ; **PostgreSQL** est la source de vérité applicative.

---

## Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 📊 Import Excel | Injection du classeur (commandes, recettes, poids) — remplace le référentiel en base via une transaction |
| 🧮 Moteur de formules | Rejoue les formules réelles du classeur à chaque import pour valider l'extraction (788/788 formules reproduites, 0 erreur de parsing) |
| 🤖 Classification IA (optionnelle) | Détection des feuilles via Claude (Haiku) quand la reconnaissance par nom échoue — jamais déclenchée automatiquement |
| 🔍 Rapprochement flou | Recettes et poids reliés aux produits malgré variations de nom (accents, articles, pluriels) |
| 📋 Commandes | Seule zone d'écriture de l'app — quantités par produit et par jour |
| 🥖 Fiches de production | Regroupement par pâte, coefficients, pesées arrondies, checklist du jour |
| ⚖️ Arrondis de pesée | Heuristique par ingrédient (sel, levure, reste), ajustable en base sans réimport |
| 📖 Recettes & poids | Référentiels en lecture seule |
| 🗑️ Zone de danger | Purge du référentiel derrière double confirmation (front + API) |
| 🔐 Authentification | Session par cookie httpOnly côté frontend, token Bearer côté API |
| 📱 PWA installable | SvelteKit + `@vite-pwa/sveltekit` — manifest et support hors ligne |

---

## Déploiement (Docker)

C'est la méthode recommandée. Le `docker-compose.yml` orchestre trois services : **db** (PostgreSQL 16), **backend** (port interne 3001) et **frontend** (port interne 3000).

**1. Configurer l'environnement**

```bash
cp .env.example .env
# Éditer .env : POSTGRES_PASSWORD
cp backend/.env.example backend/.env
# Éditer backend/.env : DATABASE_URL (même mot de passe que ci-dessus), CORS_ORIGIN, ANTHROPIC_API_KEY (optionnel)
```

**2. Lancer**

```bash
docker compose up --build
```

**3. Créer un compte** (aucune inscription en libre-service)

```bash
docker compose exec backend npm run create-user:prod -- "email@example.com" "motdepasse" "Nom"
```

L'application tourne sur un **Raspberry Pi** (`caesura`) et est exposée publiquement via un **tunnel Cloudflare** (aucun port à ouvrir sur le routeur) sur `https://fournilapp.alithiel31.dev`.
En accès direct sur le Pi (debug), ports décalés `3002` (frontend) / `3003` (API) — `3000`/`3001`/`5433` étant déjà pris par d'autres projets sur ce Pi.
Le frontend reste servi par **Node** (`adapter-node`, SSR + form actions) : pas d'étape nginx possible ici sans perdre le rendu serveur.
Le tunnel Cloudflare gère le **HTTPS** et le nom de domaine — aucun certificat à gérer manuellement.
Le stage de build frontend utilise `npm install` (pas `npm ci`) : le `package-lock.json`, généré sur poste de dev Windows x64, ne référence pas toujours le binaire natif Rollup de la plateforme du Pi (`arm64-musl`) — bug connu [npm/cli#4828](https://github.com/npm/cli/issues/4828). `npm install` force une résolution fraîche des dépendances optionnelles côté build.

---

## API

Toutes les routes `/api/*` sauf `/api/auth/login` exigent `Authorization: Bearer <token>` (401 sinon). Le token s'obtient via `/api/auth/login` et vit côté frontend dans un cookie httpOnly (voir `frontend/src/hooks.server.ts`).

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | sonde de vie |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, expiresAt }` (public) |
| POST | `/api/auth/logout` | invalide le token courant |
| GET | `/api/auth/me` | utilisateur courant |
| POST | `/api/import` | injection xlsx (multipart, champ `file`, + `commandesSheet`/`poidsSheet` optionnels) |
| POST | `/api/import/analyze` | classification IA des feuilles (multipart, champ `file`) — à la demande |
| GET | `/api/imports` | historique des injections + rapports (avec auteur) |
| POST | `/api/admin/reset-data` | `{ confirm: "SUPPRIMER" }` → vide Pate/Recette/RecetteLigne/Produit/Commande |
| GET | `/api/commandes` | pâtes → produits → quantités par jour |
| PUT | `/api/commandes` | `{ produitId, jour, quantite }` |
| GET | `/api/production/:jour` | fiches du jour (pâtes, coef, pesées arrondies) |
| GET | `/api/recettes` | recettes (lecture seule) |
| GET | `/api/poids` | poids unitaires + produits non rapprochés |

---

## Pipeline d'import — détails

1. **Feuille Commandes** : détection de la ligne d'en-tête par présence d'au moins 3 noms de jours. Ligne texte sans quantités = **section** (la pâte), ligne texte + quantités = **produit** rattaché à la section courante.
2. **Poids unitaires** : feuille reconnue par son nom, colonne « gr ss ing » privilégiée sur « gr à l'unité » (la pâte seule sert au coefficient).
3. **Recettes** : une feuille par section, rapprochée par nom flou (gère « Maïs » avec espace final). Ingrédients lus jusqu'à la ligne « Total » = base.
4. **Rapprochement flou** (`normalize` + `fuzzyFind`) : accents, articles, pluriels, comparaison par jetons. « Baguette au Levain » ↔ « Baguette levain » ✓.
5. **Validation croisée** puis **transaction** de remplacement complet du référentiel.

Constat sur le classeur réel : une section « Divers » (Burger, Hot-dog, Carré au lait…) sans feuille recette ni poids — le rapport d'import remonte ces cas en ⚠.

### Classification IA (optionnelle)

Si la détection par nom échoue (feuille « Commandes » ou « Poids » introuvable), `/import` propose un bouton « Essayer l'analyse IA » — jamais déclenché automatiquement. Il envoie à Claude (Haiku) un échantillon de chaque feuille (nom + ~12 lignes/10 colonnes, voir `backend/src/ai/classify-workbook.ts`) et reçoit une proposition de rôle par feuille (commandes / poids / recette / autre) via un appel outil structuré. L'utilisateur choisit/corrige les feuilles proposées, puis l'import repart sur le pipeline déterministe habituel (`extractModel` avec overrides, puis `validateImport`) — l'IA ne fait que deviner la structure, jamais les chiffres. Sans `ANTHROPIC_API_KEY`, l'import normal n'est pas affecté ; le bouton renvoie juste une erreur explicite.

### Zone de danger

Sur `/import`, un bouton replié « Zone de danger » vide Pate/Recette/RecetteLigne/Produit/Commande — jamais les comptes ni l'historique des imports. Double confirmation : il faut taper exactement `SUPPRIMER` côté front pour activer le bouton, et l'API revérifie ce même mot dans le corps de la requête (`POST /api/admin/reset-data`) avant toute suppression.

### Arrondis de pesée

Heuristique par ingrédient (`arrondiFor`) : sel → 20 g, levure → 5 g, reste → 50 g. Stockée par ligne de recette (`RecetteLigne.arrondi`), ajustable en base sans réimport. Piste v2 : lire les pas exacts des `CEILING(...)` du classeur à l'import.

---

## Variables d'environnement

### Racine (`.env`, orchestration Docker)

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | — | Mot de passe PostgreSQL — doit matcher `DATABASE_URL` dans `backend/.env` |

### Backend (`backend/.env`)

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Chaîne de connexion Prisma → PostgreSQL |
| `PORT` | ❌ | `3001` | Port du backend |
| `CORS_ORIGIN` | ❌ | — | Origine(s) autorisée(s), séparées par des virgules |
| `ANTHROPIC_API_KEY` | ❌ | — | Requis uniquement pour la classification IA optionnelle (`/api/import/analyze`) |

---

## Développement local

### Backend (port 3001)

```bash
cd backend && npm install
npx prisma migrate dev --name init   # applique le schéma
npm run dev                          # rechargement auto (tsx --watch)
npm run create-user -- "moi@example.com" "motdepasse-long" "Mon Nom"
```

Autres commandes utiles : `npm test` (Vitest — moteur de formules), `npm run lint`, `npm run db:studio`.

### Frontend (port 5173/3000)

```bash
cd frontend && npm install
API_URL=http://localhost:3001 npm run dev
```

Ouvrir `http://localhost:5173`.

---

## Structure

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
│       ├── ai/classify-workbook.ts # classification IA (Anthropic), à la demande
│       ├── services/importer.ts# transaction de remplacement du référentiel
│       └── domain/production.ts# fiches du jour : regroupement, coef, pesées
└── frontend/                   # SvelteKit (Svelte 5) PWA  (port 3000)
    ├── Dockerfile
    ├── vite.config.ts          # @vite-pwa/sveltekit : manifest + offline
    └── src/
        ├── hooks.server.ts      # garde toutes les routes (session → sinon /login)
        ├── lib/api.ts           # client API (API_URL, réseau Docker, token Bearer)
        └── routes/
            ├── +layout.svelte          # navigation basse 4 onglets + déconnexion
            ├── login/  ·  logout/      # auth (cookie httpOnly "session")
            ├── commandes/              # SEULE zone d'écriture (PUT /api/commandes)
            ├── production/[jour]/      # fiches + checklist de pesée
            ├── recettes/  ·  poids/    # référentiels lecture seule
            └── +page.server.ts         # redirection → /production/lundi
```

Flux de données :

```
 classeur .xlsx ──▶ POST /api/import ──▶ extractModel ──▶ validateImport ──▶ applyImport
                    (multipart)          (référentiel)    (moteur rejoue     (transaction
                                                           les formules,      Prisma)
                                                           ≥95 % sinon 422)
                                                                 │
 frontend SvelteKit ◀── GET /api/commandes|production|recettes|poids ◀── PostgreSQL
 (loaders serveur, API_URL=http://backend:3001 sur le réseau Docker)
```

---

## Notes

**Le moteur de formules n'est pas utilisé au runtime** — décision clé d'architecture. Il sert uniquement de **validateur d'import** : à chaque injection, il exécute les formules réelles du classeur et vérifie que l'extraction est cohérente. Les calculs de l'app vivent dans `backend/src/domain`, en TypeScript testé.

**PWA** — `registerType: autoUpdate`, manifest standalone/portrait (thème `#C4771C`), precache du shell + `StaleWhileRevalidate` sur les référentiels. Icônes générées dans `frontend/static/`.
`@vite-pwa/sveltekit` génère `manifest.webmanifest`/`sw.js` mais n'injecte rien dans le HTML (pas d'équivalent Vue/React) : le `<link rel="manifest">` est posé à la main dans `app.html`, et l'enregistrement du service worker se fait côté client dans `+layout.svelte` via `virtual:pwa-register/svelte` (guardé par `browser` pour ne pas casser le SSR).

---

## Feuille de route

- [x] Auth (sessions token côté API, argon2) — pas encore de rôles boulanger/admin (un seul niveau d'accès)
- [x] Couche IA (optionnelle) : classification automatique des feuilles d'un classeur inconnu, déclenchée à la demande
- [ ] Page d'import côté front avec affichage du rapport et de la validation
- [ ] Lecture des pas d'arrondi exacts depuis les `CEILING` du classeur
- [ ] Export xlsx (trajet inverse : base → classeur)
- [ ] Historique des commandes par semaine (champ `semaine` sur `Commande`)

---

## Stack

| Couche | Technologie |
|---|---|
| Backend | Express 4 · Node.js 22+ · TypeScript 5.7 · Prisma 6.5 |
| Frontend | SvelteKit · Svelte 5 · TypeScript · Vite 6 |
| PWA | `@vite-pwa/sveltekit` — manifest + hors ligne |
| Base de données | PostgreSQL 16 |
| Import Excel | `xlsx` · moteur de formules maison (validateur) |
| IA | Anthropic SDK (Claude Haiku) — classification de feuilles, à la demande |
| Auth | `argon2` (hash) · session cookie httpOnly · token Bearer |
| Infra | Docker · Raspberry Pi · Cloudflare Tunnel |
| CI | GitHub Actions (`ci.yml` — lint, typecheck, tests, build Docker) |

## License

MIT — voir [LICENSE](./LICENSE)

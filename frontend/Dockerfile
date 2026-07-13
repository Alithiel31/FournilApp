# ── development : vite dev server avec hot-reload ─────────────────────────
FROM node:22-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ── build : vite build → build/ (adapter-node) ────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
# package-lock.json généré sur Windows x64 : structure incomplète pour les
# deps optionnelles arm64-musl (bug npm/cli#4828). On ignore ce lockfile et on
# laisse npm résoudre un arbre frais et correct pour la plateforme du build.
RUN npm install
COPY . .
RUN npm run build

# ── production : SvelteKit adapter-node — le SSR (loaders, actions) exige
#    Node en prod ; contrairement à QcWeather (SPA statique servie par
#    nginx), pas d'étape nginx possible ici sans perdre le rendu serveur.
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "build"]

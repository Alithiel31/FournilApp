# ── deps : dépendances complètes (dev + prod) + client Prisma généré ──────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# ── development : tsx --watch, montage de volume ──────────────────────────
FROM deps AS development
COPY . .
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# ── build : compile TypeScript → dist/ ────────────────────────────────────
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── production : dépendances de prod uniquement, client Prisma régénéré ──
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

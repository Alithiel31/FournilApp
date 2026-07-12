-- CreateTable
CREATE TABLE "Pate" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Pate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recette" (
    "id" SERIAL NOT NULL,
    "pateId" INTEGER NOT NULL,
    "base" DOUBLE PRECISION NOT NULL,
    "feuille" TEXT NOT NULL,

    CONSTRAINT "Recette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetteLigne" (
    "id" SERIAL NOT NULL,
    "recetteId" INTEGER NOT NULL,
    "ingredient" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "arrondi" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecetteLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "pateId" INTEGER NOT NULL,
    "poidsPate" DOUBLE PRECISION,
    "garniture" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" SERIAL NOT NULL,
    "produitId" INTEGER NOT NULL,
    "jour" INTEGER NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rapport" JSONB NOT NULL,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pate_nom_key" ON "Pate"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Recette_pateId_key" ON "Recette"("pateId");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_nom_key" ON "Produit"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_produitId_jour_key" ON "Commande"("produitId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Recette" ADD CONSTRAINT "Recette_pateId_fkey" FOREIGN KEY ("pateId") REFERENCES "Pate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetteLigne" ADD CONSTRAINT "RecetteLigne_recetteId_fkey" FOREIGN KEY ("recetteId") REFERENCES "Recette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_pateId_fkey" FOREIGN KEY ("pateId") REFERENCES "Pate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

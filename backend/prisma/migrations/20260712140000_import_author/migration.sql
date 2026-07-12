-- AlterTable
ALTER TABLE "Import" ADD COLUMN "importedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

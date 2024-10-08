/*
  Warnings:

  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('Neuf', 'Comme_neuf', 'Bon_etat', 'Moyen_etat', 'Mauvais_etat');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "status",
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "condition" "Condition" NOT NULL DEFAULT 'Neuf';

-- DropEnum
DROP TYPE "Status";

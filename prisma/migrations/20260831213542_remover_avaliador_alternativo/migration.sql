-- DropForeignKey
ALTER TABLE "Curso" DROP CONSTRAINT "Curso_avaliadorAlternativoId_fkey";

-- AlterTable
ALTER TABLE "Curso" DROP COLUMN "avaliadorAlternativoId";


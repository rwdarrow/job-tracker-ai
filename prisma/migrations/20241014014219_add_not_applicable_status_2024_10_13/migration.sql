/*
  Warnings:

  - A unique constraint covering the columns `[requisitionNumber]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'NOT_APPLICABLE';

-- DropIndex
DROP INDEX "Role_createdById_companyId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Role_requisitionNumber_key" ON "Role"("requisitionNumber");

-- CreateIndex
CREATE INDEX "Role_createdById_companyId_title_requisitionNumber_idx" ON "Role"("createdById", "companyId", "title", "requisitionNumber");

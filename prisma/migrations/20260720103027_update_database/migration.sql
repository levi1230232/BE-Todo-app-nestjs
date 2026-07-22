/*
  Warnings:

  - A unique constraint covering the columns `[refreshJti]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refreshJti` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "refreshJti" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshJti_key" ON "Session"("refreshJti");

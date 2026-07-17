/*
  Warnings:

  - A unique constraint covering the columns `[name,owner_id]` on the table `team` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "team_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "team_name_owner_id_key" ON "team"("name", "owner_id");

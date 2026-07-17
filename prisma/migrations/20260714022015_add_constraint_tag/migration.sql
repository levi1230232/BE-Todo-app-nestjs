/*
  Warnings:

  - A unique constraint covering the columns `[user_id,name]` on the table `tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[team_id,name]` on the table `tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `team` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tag_user_id_name_key" ON "tag"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tag_team_id_name_key" ON "tag"("team_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "team_name_key" ON "team"("name");

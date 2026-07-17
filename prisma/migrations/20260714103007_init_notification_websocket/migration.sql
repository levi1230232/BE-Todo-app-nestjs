/*
  Warnings:

  - You are about to drop the column `remainder` on the `task` table. All the data in the column will be lost.
  - You are about to drop the column `workpace_style` on the `task` table. All the data in the column will be lost.
  - You are about to drop the `taskTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teamMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `reminder` to the `task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspace_style` to the `task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "taskTag" DROP CONSTRAINT "taskTag_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "taskTag" DROP CONSTRAINT "taskTag_task_id_fkey";

-- DropForeignKey
ALTER TABLE "teamMember" DROP CONSTRAINT "teamMember_team_id_fkey";

-- DropForeignKey
ALTER TABLE "teamMember" DROP CONSTRAINT "teamMember_user_id_fkey";

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "task_id" INTEGER;

-- AlterTable
ALTER TABLE "task" DROP COLUMN "remainder",
DROP COLUMN "workpace_style",
ADD COLUMN     "reminder" INTEGER NOT NULL,
ADD COLUMN     "workspace_style" "WorkspaceStyle" NOT NULL;

-- DropTable
DROP TABLE "taskTag";

-- DropTable
DROP TABLE "teamMember";

-- CreateTable
CREATE TABLE "team_member" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "role" "TeamMemberRole" NOT NULL,
    "join_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reminder_log" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reminder_type" "NotificationType" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reminder_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tag" (
    "task_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "task_tag_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_member_user_id_team_id_key" ON "team_member"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_reminder_log_task_id_user_id_reminder_type_key" ON "task_reminder_log"("task_id", "user_id", "reminder_type");

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminder_log" ADD CONSTRAINT "task_reminder_log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminder_log" ADD CONSTRAINT "task_reminder_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag" ADD CONSTRAINT "task_tag_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tag" ADD CONSTRAINT "task_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

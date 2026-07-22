/*
  Warnings:

  - Made the column `isDelete` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "isDelete" SET NOT NULL,
ALTER COLUMN "isDelete" SET DEFAULT false;

/*
  Warnings:

  - You are about to drop the column `faviconUrl` on the `BusinessSettings` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `BusinessSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BusinessSettings" DROP COLUMN "faviconUrl",
DROP COLUMN "logoUrl",
ADD COLUMN     "slogan" TEXT,
ADD COLUMN     "subname" TEXT,
ADD COLUMN     "subtitle" TEXT;

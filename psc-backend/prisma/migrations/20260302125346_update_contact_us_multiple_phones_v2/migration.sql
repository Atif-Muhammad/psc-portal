/*
  Warnings:

  - You are about to drop the column `phone` on the `contactus` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `contactus` DROP COLUMN `phone`,
    ADD COLUMN `phoneNumbers` JSON NOT NULL;

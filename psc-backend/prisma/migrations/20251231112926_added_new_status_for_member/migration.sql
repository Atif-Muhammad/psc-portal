/*
  Warnings:

  - You are about to alter the column `Status` on the `member` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(12))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `clubrule` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'CLUB';

-- AlterTable
ALTER TABLE `member` ADD COLUMN `Actual_Status` ENUM('REGULAR', 'ABSENT', 'CANCELLED', 'CLEAR', 'DEFAULTER', 'DIED', 'HONORARY', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'CLEAR',
    MODIFY `Status` VARCHAR(191) NOT NULL DEFAULT 'active';

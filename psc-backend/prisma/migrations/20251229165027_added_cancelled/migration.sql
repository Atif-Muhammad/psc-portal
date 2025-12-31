-- AlterTable
ALTER TABLE `hallbooking` ADD COLUMN `isCancelled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `lawnbooking` ADD COLUMN `isCancelled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `photoshootbooking` ADD COLUMN `isCancelled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `isCancelled` BOOLEAN NOT NULL DEFAULT false;

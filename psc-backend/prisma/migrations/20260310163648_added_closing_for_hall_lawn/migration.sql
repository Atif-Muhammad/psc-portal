-- AlterTable
ALTER TABLE `hallbooking` ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `lawnbooking` ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

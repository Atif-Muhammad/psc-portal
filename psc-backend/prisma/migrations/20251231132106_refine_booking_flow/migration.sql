-- AlterTable
ALTER TABLE `hallbooking` ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `lawnbooking` ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `paymentvoucher` ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `photoshootbooking` ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT false;

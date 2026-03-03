-- AlterTable
ALTER TABLE `affclubbooking` ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

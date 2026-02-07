-- AlterTable
ALTER TABLE `hallcancellationrequest` ADD COLUMN `requestedBy` TEXT NULL;

-- AlterTable
ALTER TABLE `lawncancellationrequest` ADD COLUMN `requestedBy` TEXT NULL;

-- AlterTable
ALTER TABLE `photoshootcancellationrequest` ADD COLUMN `requestedBy` TEXT NULL;

-- AlterTable
ALTER TABLE `roomcancellationrequest` ADD COLUMN `requestedBy` TEXT NULL;

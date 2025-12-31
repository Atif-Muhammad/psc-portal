-- AlterTable
ALTER TABLE `aboutus` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `admin` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `affiliatedclub` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `affiliatedclubrequest` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `announcement` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `clubhistory` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `clubrule` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `event` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `hall` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `hallbooking` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `halloutoforder` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `hallreservation` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `lawn` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `lawnbooking` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `lawncategory` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `lawnoutoforder` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `lawnreservation` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `member` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `photoshoot` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `photoshootbooking` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `remarks` TEXT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `photoshootreservation` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `promotionalad` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `room` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `roomoutoforder` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `roomtype` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `sport` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `sportcharge` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `updatedBy` VARCHAR(191) NOT NULL DEFAULT '';

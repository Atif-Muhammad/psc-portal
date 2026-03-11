-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `local_sync` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `local_sync_id` VARCHAR(191) NULL,
    ADD COLUMN `local_sync_message` TEXT NULL,
    ADD COLUMN `local_sync_status` INTEGER NULL,
    ADD COLUMN `sync_datetime` DATETIME(3) NULL;

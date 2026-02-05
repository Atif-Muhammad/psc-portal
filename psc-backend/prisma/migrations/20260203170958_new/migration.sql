/*
  Warnings:

  - The primary key for the `paymentvoucher` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[consumer_number]` on the table `PaymentVoucher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[voucher_no]` on the table `PaymentVoucher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `PaymentVoucher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `lawn` MODIFY `description` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `paymentvoucher` DROP PRIMARY KEY,
    ADD COLUMN `bank_name` VARCHAR(191) NULL,
    ADD COLUMN `card_number` VARCHAR(191) NULL,
    ADD COLUMN `check_number` VARCHAR(191) NULL,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `voucher_no` VARCHAR(191) NULL,
    MODIFY `payment_mode` ENUM('CASH', 'ONLINE', 'CARD', 'CHECK') NOT NULL DEFAULT 'CASH',
    MODIFY `voucher_type` ENUM('FULL_PAYMENT', 'HALF_PAYMENT', 'REFUND', 'ADJUSTMENT', 'ADVANCE_PAYMENT') NOT NULL,
    MODIFY `consumer_number` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `photoshoot` MODIFY `description` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `PhotoshootOutOfOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `photoshootId` INTEGER NOT NULL,
    `reason` VARCHAR(300) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `PhotoshootOutOfOrder_id_key`(`id`),
    INDEX `PhotoshootOutOfOrder_photoshootId_idx`(`photoshootId`),
    INDEX `PhotoshootOutOfOrder_startDate_idx`(`startDate`),
    INDEX `PhotoshootOutOfOrder_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PaymentVoucher_consumer_number_key` ON `PaymentVoucher`(`consumer_number`);

-- CreateIndex
CREATE UNIQUE INDEX `PaymentVoucher_voucher_no_key` ON `PaymentVoucher`(`voucher_no`);

-- CreateIndex
CREATE INDEX `PaymentVoucher_consumer_number_idx` ON `PaymentVoucher`(`consumer_number`);

-- CreateIndex
CREATE INDEX `PaymentVoucher_voucher_no_idx` ON `PaymentVoucher`(`voucher_no`);

-- AddForeignKey
ALTER TABLE `PhotoshootOutOfOrder` ADD CONSTRAINT `PhotoshootOutOfOrder_photoshootId_fkey` FOREIGN KEY (`photoshootId`) REFERENCES `Photoshoot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

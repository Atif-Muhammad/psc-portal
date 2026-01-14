/*
  Warnings:

  - You are about to drop the column `messingCategoryId` on the `messingitem` table. All the data in the column will be lost.
  - Added the required column `messingSubCategoryId` to the `MessingItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `messingitem` DROP FOREIGN KEY `MessingItem_messingCategoryId_fkey`;

-- DropIndex
DROP INDEX `MessingItem_messingCategoryId_idx` ON `messingitem`;

-- AlterTable
ALTER TABLE `messingitem` DROP COLUMN `messingCategoryId`,
    ADD COLUMN `messingSubCategoryId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `MessingSubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messingCategoryId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `images` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MessingSubCategory_id_key`(`id`),
    INDEX `MessingSubCategory_messingCategoryId_idx`(`messingCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MessingItem_messingSubCategoryId_idx` ON `MessingItem`(`messingSubCategoryId`);

-- AddForeignKey
ALTER TABLE `MessingSubCategory` ADD CONSTRAINT `MessingSubCategory_messingCategoryId_fkey` FOREIGN KEY (`messingCategoryId`) REFERENCES `MessingCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessingItem` ADD CONSTRAINT `MessingItem_messingSubCategoryId_fkey` FOREIGN KEY (`messingSubCategoryId`) REFERENCES `MessingSubCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

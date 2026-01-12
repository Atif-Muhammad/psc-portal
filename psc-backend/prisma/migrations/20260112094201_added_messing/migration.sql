-- CreateTable
CREATE TABLE `MessingCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(200) NOT NULL,
    `images` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MessingCategory_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessingItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messingCategoryId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    `createdBy` VARCHAR(191) NOT NULL DEFAULT '',
    `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MessingItem_id_key`(`id`),
    INDEX `MessingItem_messingCategoryId_idx`(`messingCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MessingItem` ADD CONSTRAINT `MessingItem_messingCategoryId_fkey` FOREIGN KEY (`messingCategoryId`) REFERENCES `MessingCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `feedback` ADD COLUMN `categoryId` INTEGER NULL,
    ADD COLUMN `subCategoryId` INTEGER NULL;

-- CreateTable
CREATE TABLE `FeedbackCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeedbackCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackSubCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeedbackSubCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Feedback_categoryId_idx` ON `Feedback`(`categoryId`);

-- CreateIndex
CREATE INDEX `Feedback_subCategoryId_idx` ON `Feedback`(`subCategoryId`);

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `FeedbackCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `FeedbackSubCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

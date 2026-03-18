-- CreateTable
CREATE TABLE `throttlelog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL,
    `failed` INTEGER NOT NULL,
    `success` INTEGER NOT NULL,
    `recentAttempt` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

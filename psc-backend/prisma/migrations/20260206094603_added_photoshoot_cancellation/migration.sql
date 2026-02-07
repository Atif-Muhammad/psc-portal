-- CreateTable
CREATE TABLE `PhotoshootCancellationRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PhotoshootCancellationRequest_bookingId_key`(`bookingId`),
    INDEX `PhotoshootCancellationRequest_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PhotoshootCancellationRequest` ADD CONSTRAINT `PhotoshootCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `PhotoshootBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

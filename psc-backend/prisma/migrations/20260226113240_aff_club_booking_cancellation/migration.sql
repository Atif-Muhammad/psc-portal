-- CreateTable
CREATE TABLE `AffClubCancellationRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `requestedBy` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `adminRemarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AffClubCancellationRequest_bookingId_idx`(`bookingId`),
    INDEX `AffClubCancellationRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AffClubCancellationRequest` ADD CONSTRAINT `AffClubCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `AffClubBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

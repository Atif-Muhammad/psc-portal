/*
  Warnings:

  - You are about to drop the column `affiliatedClubId` on the `roombooking` table. All the data in the column will be lost.
  - You are about to drop the column `affiliatedMembershipNo` on the `roombooking` table. All the data in the column will be lost.
  - Made the column `Membership_No` on table `roombooking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `roombooking` DROP FOREIGN KEY `RoomBooking_Membership_No_fkey`;

-- DropForeignKey
ALTER TABLE `roombooking` DROP FOREIGN KEY `RoomBooking_affiliatedClubId_fkey`;

-- DropIndex
DROP INDEX `RoomBooking_Membership_No_fkey` ON `roombooking`;

-- DropIndex
DROP INDEX `RoomBooking_affiliatedClubId_fkey` ON `roombooking`;

-- AlterTable
ALTER TABLE `roombooking` DROP COLUMN `affiliatedClubId`,
    DROP COLUMN `affiliatedMembershipNo`,
    MODIFY `Membership_No` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `AffClubBooking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `affiliatedClubId` INTEGER NOT NULL,
    `affiliatedMembershipNo` VARCHAR(100) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `totalPrice` DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    `paymentStatus` ENUM('UNPAID', 'HALF_PAID', 'PAID', 'TO_BILL', 'ADVANCE_PAYMENT') NOT NULL DEFAULT 'UNPAID',
    `paidAmount` DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    `pendingAmount` DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    `paymentMode` VARCHAR(191) NOT NULL DEFAULT 'CASH',
    `numberOfAdults` INTEGER NOT NULL DEFAULT 1,
    `numberOfChildren` INTEGER NOT NULL DEFAULT 0,
    `guestName` TEXT NULL,
    `guestContact` TEXT NULL,
    `guestCNIC` TEXT NULL,
    `specialRequests` TEXT NULL,
    `remarks` TEXT NULL,
    `extraCharges` JSON NULL,
    `isCancelled` BOOLEAN NOT NULL DEFAULT false,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `refundAmount` DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
    `refundReturned` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AffClubBooking_affiliatedClubId_idx`(`affiliatedClubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AffClubBookingRoom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `roomId` INTEGER NOT NULL,
    `priceAtBooking` DECIMAL(30, 2) NOT NULL,

    INDEX `AffClubBookingRoom_bookingId_idx`(`bookingId`),
    INDEX `AffClubBookingRoom_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RoomBooking` ADD CONSTRAINT `RoomBooking_Membership_No_fkey` FOREIGN KEY (`Membership_No`) REFERENCES `Member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffClubBooking` ADD CONSTRAINT `AffClubBooking_affiliatedClubId_fkey` FOREIGN KEY (`affiliatedClubId`) REFERENCES `AffiliatedClub`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffClubBookingRoom` ADD CONSTRAINT `AffClubBookingRoom_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `AffClubBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AffClubBookingRoom` ADD CONSTRAINT `AffClubBookingRoom_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

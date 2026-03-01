-- DropForeignKey
ALTER TABLE `roombooking` DROP FOREIGN KEY `RoomBooking_Membership_No_fkey`;

-- DropIndex
DROP INDEX `RoomBooking_Membership_No_fkey` ON `roombooking`;

-- AlterTable
ALTER TABLE `roombooking` ADD COLUMN `affiliatedClubId` INTEGER NULL,
    ADD COLUMN `affiliatedMembershipNo` VARCHAR(191) NULL,
    MODIFY `Membership_No` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `RoomBooking` ADD CONSTRAINT `RoomBooking_Membership_No_fkey` FOREIGN KEY (`Membership_No`) REFERENCES `Member`(`Membership_No`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomBooking` ADD CONSTRAINT `RoomBooking_affiliatedClubId_fkey` FOREIGN KEY (`affiliatedClubId`) REFERENCES `AffiliatedClub`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

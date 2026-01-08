-- DropForeignKey
ALTER TABLE `deliverednotis` DROP FOREIGN KEY `deliveredNotis_member_fkey`;

-- DropIndex
DROP INDEX `deliveredNotis_member_fkey` ON `deliverednotis`;

-- AlterTable
ALTER TABLE `deliverednotis` MODIFY `member` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `deliveredNotis` ADD CONSTRAINT `deliveredNotis_member_fkey` FOREIGN KEY (`member`) REFERENCES `Member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

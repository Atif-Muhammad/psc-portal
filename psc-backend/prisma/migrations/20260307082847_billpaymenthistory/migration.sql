-- DropForeignKey
ALTER TABLE `affclubbooking` DROP FOREIGN KEY `AffClubBooking_affiliatedClubId_fkey`;

-- DropForeignKey
ALTER TABLE `affclubbookingroom` DROP FOREIGN KEY `AffClubBookingRoom_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `affclubbookingroom` DROP FOREIGN KEY `AffClubBookingRoom_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `affclubcancellationrequest` DROP FOREIGN KEY `AffClubCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `affiliatedclubrequest` DROP FOREIGN KEY `AffiliatedClubRequest_affiliatedClubId_fkey`;

-- DropForeignKey
ALTER TABLE `deliverednotis` DROP FOREIGN KEY `deliveredNotis_member_fkey`;

-- DropForeignKey
ALTER TABLE `deliverednotis` DROP FOREIGN KEY `deliveredNotis_notificationId_fkey`;

-- DropForeignKey
ALTER TABLE `feedback` DROP FOREIGN KEY `Feedback_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `feedback` DROP FOREIGN KEY `Feedback_memberNo_fkey`;

-- DropForeignKey
ALTER TABLE `feedback` DROP FOREIGN KEY `Feedback_subCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `feedbackremark` DROP FOREIGN KEY `FeedbackRemark_feedbackId_fkey`;

-- DropForeignKey
ALTER TABLE `hallbooking` DROP FOREIGN KEY `HallBooking_hallId_fkey`;

-- DropForeignKey
ALTER TABLE `hallbooking` DROP FOREIGN KEY `HallBooking_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `hallcancellationrequest` DROP FOREIGN KEY `HallCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `hallholdings` DROP FOREIGN KEY `hallHoldings_hallId_fkey`;

-- DropForeignKey
ALTER TABLE `hallholdings` DROP FOREIGN KEY `hallHoldings_holdBy_fkey`;

-- DropForeignKey
ALTER TABLE `halloutoforder` DROP FOREIGN KEY `HallOutOfOrder_hallId_fkey`;

-- DropForeignKey
ALTER TABLE `hallreservation` DROP FOREIGN KEY `HallReservation_hallId_fkey`;

-- DropForeignKey
ALTER TABLE `hallreservation` DROP FOREIGN KEY `HallReservation_reservedBy_fkey`;

-- DropForeignKey
ALTER TABLE `lawn` DROP FOREIGN KEY `Lawn_lawnCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnbooking` DROP FOREIGN KEY `LawnBooking_lawnId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnbooking` DROP FOREIGN KEY `LawnBooking_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `lawncancellationrequest` DROP FOREIGN KEY `LawnCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnholdings` DROP FOREIGN KEY `lawnHoldings_holdBy_fkey`;

-- DropForeignKey
ALTER TABLE `lawnholdings` DROP FOREIGN KEY `lawnHoldings_lawnId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnoutoforder` DROP FOREIGN KEY `LawnOutOfOrder_lawnId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnreservation` DROP FOREIGN KEY `LawnReservation_lawnId_fkey`;

-- DropForeignKey
ALTER TABLE `lawnreservation` DROP FOREIGN KEY `LawnReservation_reservedBy_fkey`;

-- DropForeignKey
ALTER TABLE `messingitem` DROP FOREIGN KEY `MessingItem_messingSubCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `messingsubcategory` DROP FOREIGN KEY `MessingSubCategory_messingCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootbooking` DROP FOREIGN KEY `PhotoshootBooking_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootbooking` DROP FOREIGN KEY `PhotoshootBooking_photoshootId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootcancellationrequest` DROP FOREIGN KEY `PhotoshootCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootoutoforder` DROP FOREIGN KEY `PhotoshootOutOfOrder_photoshootId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootreservation` DROP FOREIGN KEY `PhotoshootReservation_photoshootId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootreservation` DROP FOREIGN KEY `PhotoshootReservation_reservedBy_fkey`;

-- DropForeignKey
ALTER TABLE `room` DROP FOREIGN KEY `Room_roomTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `roombooking` DROP FOREIGN KEY `RoomBooking_Membership_No_fkey`;

-- DropForeignKey
ALTER TABLE `roomcancellationrequest` DROP FOREIGN KEY `RoomCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `roomholdings` DROP FOREIGN KEY `roomHoldings_holdBy_fkey`;

-- DropForeignKey
ALTER TABLE `roomholdings` DROP FOREIGN KEY `roomHoldings_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `roomonbooking` DROP FOREIGN KEY `RoomOnBooking_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `roomonbooking` DROP FOREIGN KEY `RoomOnBooking_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `roomoutoforder` DROP FOREIGN KEY `RoomOutOfOrder_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `roomreservation` DROP FOREIGN KEY `RoomReservation_reservedBy_fkey`;

-- DropForeignKey
ALTER TABLE `roomreservation` DROP FOREIGN KEY `RoomReservation_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `sportcharge` DROP FOREIGN KEY `SportCharge_activityId_fkey`;

-- DropForeignKey
ALTER TABLE `sportsubscription` DROP FOREIGN KEY `SportSubscription_memberId_fkey`;

-- DropForeignKey
ALTER TABLE `sportsubscription` DROP FOREIGN KEY `SportSubscription_sportId_fkey`;

-- CreateTable
CREATE TABLE `billpaymenthistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `membershipNo` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `remarks` TEXT NULL,
    `consumerNo` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billpaymenthistory_consumerNo_key`(`consumerNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roombooking` ADD CONSTRAINT `roombooking_Membership_No_fkey` FOREIGN KEY (`Membership_No`) REFERENCES `member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallbooking` ADD CONSTRAINT `hallbooking_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `member`(`Sno`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallbooking` ADD CONSTRAINT `hallbooking_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `hall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnbooking` ADD CONSTRAINT `lawnbooking_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `member`(`Sno`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnbooking` ADD CONSTRAINT `lawnbooking_lawnId_fkey` FOREIGN KEY (`lawnId`) REFERENCES `lawn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootbooking` ADD CONSTRAINT `photoshootbooking_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `member`(`Sno`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootbooking` ADD CONSTRAINT `photoshootbooking_photoshootId_fkey` FOREIGN KEY (`photoshootId`) REFERENCES `photoshoot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sportsubscription` ADD CONSTRAINT `sportsubscription_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `member`(`Sno`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sportsubscription` ADD CONSTRAINT `sportsubscription_sportId_fkey` FOREIGN KEY (`sportId`) REFERENCES `sport`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomreservation` ADD CONSTRAINT `roomreservation_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomreservation` ADD CONSTRAINT `roomreservation_reservedBy_fkey` FOREIGN KEY (`reservedBy`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `roomtype`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomonbooking` ADD CONSTRAINT `roomonbooking_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `roombooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomonbooking` ADD CONSTRAINT `roomonbooking_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomholdings` ADD CONSTRAINT `roomholdings_holdBy_fkey` FOREIGN KEY (`holdBy`) REFERENCES `member`(`Membership_No`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomholdings` ADD CONSTRAINT `roomholdings_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomoutoforder` ADD CONSTRAINT `roomoutoforder_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallholdings` ADD CONSTRAINT `hallholdings_holdBy_fkey` FOREIGN KEY (`holdBy`) REFERENCES `member`(`Membership_No`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallholdings` ADD CONSTRAINT `hallholdings_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `hall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `halloutoforder` ADD CONSTRAINT `halloutoforder_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `hall`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallreservation` ADD CONSTRAINT `hallreservation_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `hall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallreservation` ADD CONSTRAINT `hallreservation_reservedBy_fkey` FOREIGN KEY (`reservedBy`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnoutoforder` ADD CONSTRAINT `lawnoutoforder_lawnId_fkey` FOREIGN KEY (`lawnId`) REFERENCES `lawn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawn` ADD CONSTRAINT `lawn_lawnCategoryId_fkey` FOREIGN KEY (`lawnCategoryId`) REFERENCES `lawncategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnholdings` ADD CONSTRAINT `lawnholdings_holdBy_fkey` FOREIGN KEY (`holdBy`) REFERENCES `member`(`Membership_No`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnholdings` ADD CONSTRAINT `lawnholdings_lawnId_fkey` FOREIGN KEY (`lawnId`) REFERENCES `lawn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnreservation` ADD CONSTRAINT `lawnreservation_lawnId_fkey` FOREIGN KEY (`lawnId`) REFERENCES `lawn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawnreservation` ADD CONSTRAINT `lawnreservation_reservedBy_fkey` FOREIGN KEY (`reservedBy`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootreservation` ADD CONSTRAINT `photoshootreservation_photoshootId_fkey` FOREIGN KEY (`photoshootId`) REFERENCES `photoshoot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootreservation` ADD CONSTRAINT `photoshootreservation_reservedBy_fkey` FOREIGN KEY (`reservedBy`) REFERENCES `admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootoutoforder` ADD CONSTRAINT `photoshootoutoforder_photoshootId_fkey` FOREIGN KEY (`photoshootId`) REFERENCES `photoshoot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sportcharge` ADD CONSTRAINT `sportcharge_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `sport`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliatedclubrequest` ADD CONSTRAINT `affiliatedclubrequest_affiliatedClubId_fkey` FOREIGN KEY (`affiliatedClubId`) REFERENCES `affiliatedclub`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messingsubcategory` ADD CONSTRAINT `messingsubcategory_messingCategoryId_fkey` FOREIGN KEY (`messingCategoryId`) REFERENCES `messingcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messingitem` ADD CONSTRAINT `messingitem_messingSubCategoryId_fkey` FOREIGN KEY (`messingSubCategoryId`) REFERENCES `messingsubcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliverednotis` ADD CONSTRAINT `deliverednotis_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `notification`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliverednotis` ADD CONSTRAINT `deliverednotis_member_fkey` FOREIGN KEY (`member`) REFERENCES `member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roomcancellationrequest` ADD CONSTRAINT `roomcancellationrequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `roombooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallcancellationrequest` ADD CONSTRAINT `hallcancellationrequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `hallbooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lawncancellationrequest` ADD CONSTRAINT `lawncancellationrequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `lawnbooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_memberNo_fkey` FOREIGN KEY (`memberNo`) REFERENCES `member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `feedbackcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `feedbacksubcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbackremark` ADD CONSTRAINT `feedbackremark_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photoshootcancellationrequest` ADD CONSTRAINT `photoshootcancellationrequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `photoshootbooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affclubbooking` ADD CONSTRAINT `affclubbooking_affiliatedClubId_fkey` FOREIGN KEY (`affiliatedClubId`) REFERENCES `affiliatedclub`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affclubcancellationrequest` ADD CONSTRAINT `affclubcancellationrequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `affclubbooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affclubbookingroom` ADD CONSTRAINT `affclubbookingroom_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `affclubbooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affclubbookingroom` ADD CONSTRAINT `affclubbookingroom_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billpaymenthistory` ADD CONSTRAINT `billpaymenthistory_membershipNo_fkey` FOREIGN KEY (`membershipNo`) REFERENCES `member`(`Membership_No`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `admin` RENAME INDEX `Admin_email_key` TO `admin_email_key`;

-- RenameIndex
ALTER TABLE `affclubbooking` RENAME INDEX `AffClubBooking_affiliatedClubId_idx` TO `affclubbooking_affiliatedClubId_idx`;

-- RenameIndex
ALTER TABLE `affclubbookingroom` RENAME INDEX `AffClubBookingRoom_bookingId_idx` TO `affclubbookingroom_bookingId_idx`;

-- RenameIndex
ALTER TABLE `affclubbookingroom` RENAME INDEX `AffClubBookingRoom_roomId_idx` TO `affclubbookingroom_roomId_idx`;

-- RenameIndex
ALTER TABLE `affclubcancellationrequest` RENAME INDEX `AffClubCancellationRequest_bookingId_idx` TO `affclubcancellationrequest_bookingId_idx`;

-- RenameIndex
ALTER TABLE `affclubcancellationrequest` RENAME INDEX `AffClubCancellationRequest_status_idx` TO `affclubcancellationrequest_status_idx`;

-- RenameIndex
ALTER TABLE `affiliatedclubrequest` RENAME INDEX `AffiliatedClubRequest_affiliatedClubId_idx` TO `affiliatedclubrequest_affiliatedClubId_idx`;

-- RenameIndex
ALTER TABLE `affiliatedclubrequest` RENAME INDEX `AffiliatedClubRequest_membershipNo_idx` TO `affiliatedclubrequest_membershipNo_idx`;

-- RenameIndex
ALTER TABLE `contactus` RENAME INDEX `ContactUs_category_key` TO `contactus_category_key`;

-- RenameIndex
ALTER TABLE `feedback` RENAME INDEX `Feedback_categoryId_idx` TO `feedback_categoryId_idx`;

-- RenameIndex
ALTER TABLE `feedback` RENAME INDEX `Feedback_memberNo_idx` TO `feedback_memberNo_idx`;

-- RenameIndex
ALTER TABLE `feedback` RENAME INDEX `Feedback_subCategoryId_idx` TO `feedback_subCategoryId_idx`;

-- RenameIndex
ALTER TABLE `feedbackcategory` RENAME INDEX `FeedbackCategory_name_key` TO `feedbackcategory_name_key`;

-- RenameIndex
ALTER TABLE `feedbackremark` RENAME INDEX `FeedbackRemark_feedbackId_idx` TO `feedbackremark_feedbackId_idx`;

-- RenameIndex
ALTER TABLE `feedbacksubcategory` RENAME INDEX `FeedbackSubCategory_name_key` TO `feedbacksubcategory_name_key`;

-- RenameIndex
ALTER TABLE `hall` RENAME INDEX `Hall_id_key` TO `hall_id_key`;

-- RenameIndex
ALTER TABLE `hallcancellationrequest` RENAME INDEX `HallCancellationRequest_bookingId_idx` TO `hallcancellationrequest_bookingId_idx`;

-- RenameIndex
ALTER TABLE `hallcancellationrequest` RENAME INDEX `HallCancellationRequest_status_idx` TO `hallcancellationrequest_status_idx`;

-- RenameIndex
ALTER TABLE `hallholdings` RENAME INDEX `hallHoldings_id_key` TO `hallholdings_id_key`;

-- RenameIndex
ALTER TABLE `halloutoforder` RENAME INDEX `HallOutOfOrder_endDate_idx` TO `halloutoforder_endDate_idx`;

-- RenameIndex
ALTER TABLE `halloutoforder` RENAME INDEX `HallOutOfOrder_hallId_idx` TO `halloutoforder_hallId_idx`;

-- RenameIndex
ALTER TABLE `halloutoforder` RENAME INDEX `HallOutOfOrder_id_key` TO `halloutoforder_id_key`;

-- RenameIndex
ALTER TABLE `halloutoforder` RENAME INDEX `HallOutOfOrder_startDate_idx` TO `halloutoforder_startDate_idx`;

-- RenameIndex
ALTER TABLE `hallreservation` RENAME INDEX `HallReservation_hallId_idx` TO `hallreservation_hallId_idx`;

-- RenameIndex
ALTER TABLE `hallreservation` RENAME INDEX `HallReservation_reservedFrom_reservedTo_idx` TO `hallreservation_reservedFrom_reservedTo_idx`;

-- RenameIndex
ALTER TABLE `lawncancellationrequest` RENAME INDEX `LawnCancellationRequest_bookingId_idx` TO `lawncancellationrequest_bookingId_idx`;

-- RenameIndex
ALTER TABLE `lawncancellationrequest` RENAME INDEX `LawnCancellationRequest_status_idx` TO `lawncancellationrequest_status_idx`;

-- RenameIndex
ALTER TABLE `lawncategory` RENAME INDEX `LawnCategory_id_key` TO `lawncategory_id_key`;

-- RenameIndex
ALTER TABLE `lawnholdings` RENAME INDEX `lawnHoldings_id_key` TO `lawnholdings_id_key`;

-- RenameIndex
ALTER TABLE `lawnoutoforder` RENAME INDEX `LawnOutOfOrder_endDate_idx` TO `lawnoutoforder_endDate_idx`;

-- RenameIndex
ALTER TABLE `lawnoutoforder` RENAME INDEX `LawnOutOfOrder_id_key` TO `lawnoutoforder_id_key`;

-- RenameIndex
ALTER TABLE `lawnoutoforder` RENAME INDEX `LawnOutOfOrder_lawnId_idx` TO `lawnoutoforder_lawnId_idx`;

-- RenameIndex
ALTER TABLE `lawnoutoforder` RENAME INDEX `LawnOutOfOrder_startDate_idx` TO `lawnoutoforder_startDate_idx`;

-- RenameIndex
ALTER TABLE `lawnreservation` RENAME INDEX `LawnReservation_lawnId_idx` TO `lawnreservation_lawnId_idx`;

-- RenameIndex
ALTER TABLE `lawnreservation` RENAME INDEX `LawnReservation_reservedFrom_reservedTo_idx` TO `lawnreservation_reservedFrom_reservedTo_idx`;

-- RenameIndex
ALTER TABLE `member` RENAME INDEX `Member_Contact_No_key` TO `member_Contact_No_key`;

-- RenameIndex
ALTER TABLE `member` RENAME INDEX `Member_Email_key` TO `member_Email_key`;

-- RenameIndex
ALTER TABLE `member` RENAME INDEX `Member_Membership_No_key` TO `member_Membership_No_key`;

-- RenameIndex
ALTER TABLE `messingcategory` RENAME INDEX `MessingCategory_id_key` TO `messingcategory_id_key`;

-- RenameIndex
ALTER TABLE `messingitem` RENAME INDEX `MessingItem_id_key` TO `messingitem_id_key`;

-- RenameIndex
ALTER TABLE `messingitem` RENAME INDEX `MessingItem_messingSubCategoryId_idx` TO `messingitem_messingSubCategoryId_idx`;

-- RenameIndex
ALTER TABLE `messingsubcategory` RENAME INDEX `MessingSubCategory_id_key` TO `messingsubcategory_id_key`;

-- RenameIndex
ALTER TABLE `messingsubcategory` RENAME INDEX `MessingSubCategory_messingCategoryId_idx` TO `messingsubcategory_messingCategoryId_idx`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_booking_type_booking_id_idx` TO `paymentvoucher_booking_type_booking_id_idx`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_consumer_number_idx` TO `paymentvoucher_consumer_number_idx`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_consumer_number_key` TO `paymentvoucher_consumer_number_key`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_membership_no_idx` TO `paymentvoucher_membership_no_idx`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_voucher_no_idx` TO `paymentvoucher_voucher_no_idx`;

-- RenameIndex
ALTER TABLE `paymentvoucher` RENAME INDEX `PaymentVoucher_voucher_no_key` TO `paymentvoucher_voucher_no_key`;

-- RenameIndex
ALTER TABLE `photoshoot` RENAME INDEX `Photoshoot_id_key` TO `photoshoot_id_key`;

-- RenameIndex
ALTER TABLE `photoshootcancellationrequest` RENAME INDEX `PhotoshootCancellationRequest_bookingId_idx` TO `photoshootcancellationrequest_bookingId_idx`;

-- RenameIndex
ALTER TABLE `photoshootcancellationrequest` RENAME INDEX `PhotoshootCancellationRequest_status_idx` TO `photoshootcancellationrequest_status_idx`;

-- RenameIndex
ALTER TABLE `photoshootoutoforder` RENAME INDEX `PhotoshootOutOfOrder_endDate_idx` TO `photoshootoutoforder_endDate_idx`;

-- RenameIndex
ALTER TABLE `photoshootoutoforder` RENAME INDEX `PhotoshootOutOfOrder_id_key` TO `photoshootoutoforder_id_key`;

-- RenameIndex
ALTER TABLE `photoshootoutoforder` RENAME INDEX `PhotoshootOutOfOrder_photoshootId_idx` TO `photoshootoutoforder_photoshootId_idx`;

-- RenameIndex
ALTER TABLE `photoshootoutoforder` RENAME INDEX `PhotoshootOutOfOrder_startDate_idx` TO `photoshootoutoforder_startDate_idx`;

-- RenameIndex
ALTER TABLE `photoshootreservation` RENAME INDEX `PhotoshootReservation_photoshootId_idx` TO `photoshootreservation_photoshootId_idx`;

-- RenameIndex
ALTER TABLE `photoshootreservation` RENAME INDEX `PhotoshootReservation_reservedFrom_reservedTo_idx` TO `photoshootreservation_reservedFrom_reservedTo_idx`;

-- RenameIndex
ALTER TABLE `room` RENAME INDEX `Room_id_key` TO `room_id_key`;

-- RenameIndex
ALTER TABLE `room` RENAME INDEX `Room_roomNumber_key` TO `room_roomNumber_key`;

-- RenameIndex
ALTER TABLE `roomcancellationrequest` RENAME INDEX `RoomCancellationRequest_bookingId_idx` TO `roomcancellationrequest_bookingId_idx`;

-- RenameIndex
ALTER TABLE `roomcancellationrequest` RENAME INDEX `RoomCancellationRequest_status_idx` TO `roomcancellationrequest_status_idx`;

-- RenameIndex
ALTER TABLE `roomholdings` RENAME INDEX `roomHoldings_id_key` TO `roomholdings_id_key`;

-- RenameIndex
ALTER TABLE `roomonbooking` RENAME INDEX `RoomOnBooking_bookingId_idx` TO `roomonbooking_bookingId_idx`;

-- RenameIndex
ALTER TABLE `roomonbooking` RENAME INDEX `RoomOnBooking_roomId_idx` TO `roomonbooking_roomId_idx`;

-- RenameIndex
ALTER TABLE `roomoutoforder` RENAME INDEX `RoomOutOfOrder_endDate_idx` TO `roomoutoforder_endDate_idx`;

-- RenameIndex
ALTER TABLE `roomoutoforder` RENAME INDEX `RoomOutOfOrder_id_key` TO `roomoutoforder_id_key`;

-- RenameIndex
ALTER TABLE `roomoutoforder` RENAME INDEX `RoomOutOfOrder_roomId_idx` TO `roomoutoforder_roomId_idx`;

-- RenameIndex
ALTER TABLE `roomoutoforder` RENAME INDEX `RoomOutOfOrder_startDate_idx` TO `roomoutoforder_startDate_idx`;

-- RenameIndex
ALTER TABLE `roomreservation` RENAME INDEX `RoomReservation_reservedFrom_reservedTo_idx` TO `roomreservation_reservedFrom_reservedTo_idx`;

-- RenameIndex
ALTER TABLE `roomreservation` RENAME INDEX `RoomReservation_roomId_idx` TO `roomreservation_roomId_idx`;

-- RenameIndex
ALTER TABLE `roomtype` RENAME INDEX `RoomType_id_key` TO `roomtype_id_key`;

-- RenameIndex
ALTER TABLE `sport` RENAME INDEX `Sport_id_key` TO `sport_id_key`;

-- RenameIndex
ALTER TABLE `sportcharge` RENAME INDEX `SportCharge_id_key` TO `sportcharge_id_key`;

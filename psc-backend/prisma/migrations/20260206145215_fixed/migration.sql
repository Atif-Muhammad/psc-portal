-- AddForeignKey
ALTER TABLE `RoomCancellationRequest` ADD CONSTRAINT `RoomCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `RoomBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HallCancellationRequest` ADD CONSTRAINT `HallCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HallBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LawnCancellationRequest` ADD CONSTRAINT `LawnCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `LawnBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoshootCancellationRequest` ADD CONSTRAINT `PhotoshootCancellationRequest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `PhotoshootBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

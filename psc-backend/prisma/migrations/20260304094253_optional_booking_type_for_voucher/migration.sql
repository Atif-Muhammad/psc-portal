-- AlterTable
ALTER TABLE `paymentvoucher` MODIFY `booking_type` ENUM('ROOM', 'HALL', 'LAWN', 'PHOTOSHOOT') NULL,
    MODIFY `booking_id` INTEGER NULL;

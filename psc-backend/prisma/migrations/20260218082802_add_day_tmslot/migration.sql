-- AlterTable
ALTER TABLE `hallbooking` MODIFY `bookingTime` ENUM('MORNING', 'EVENING', 'NIGHT', 'DAY') NOT NULL DEFAULT 'NIGHT';

-- AlterTable
ALTER TABLE `lawnbooking` MODIFY `bookingTime` ENUM('MORNING', 'EVENING', 'NIGHT', 'DAY') NOT NULL DEFAULT 'NIGHT';

-- AlterTable
ALTER TABLE `paymentvoucher` MODIFY `payment_mode` ENUM('CASH', 'ONLINE', 'CARD', 'CHECK', 'KUICKPAY') NOT NULL DEFAULT 'CASH';

/*
  Warnings:

  - The values [KUICKPAY] on the enum `PaymentVoucher_payment_mode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `paymentvoucher` MODIFY `payment_mode` ENUM('CASH', 'ONLINE', 'CARD', 'CHECK') NOT NULL DEFAULT 'CASH',
    MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

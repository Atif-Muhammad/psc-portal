/*
  Warnings:

  - The primary key for the `paymentvoucher` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `paymentvoucher` table. All the data in the column will be lost.
  - You are about to drop the column `voucher_no` on the `paymentvoucher` table. All the data in the column will be lost.
  - Added the required column `consumer_number` to the `PaymentVoucher` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `PaymentVoucher_voucher_no_idx` ON `paymentvoucher`;

-- DropIndex
DROP INDEX `PaymentVoucher_voucher_no_key` ON `paymentvoucher`;

-- AlterTable
ALTER TABLE `paymentvoucher` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    DROP COLUMN `voucher_no`,
    ADD COLUMN `consumer_number` VARCHAR(18) NOT NULL,
    ADD PRIMARY KEY (`consumer_number`);

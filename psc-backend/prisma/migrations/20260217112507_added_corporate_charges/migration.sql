-- AlterTable
ALTER TABLE `hall` ADD COLUMN `chargesCorporate` DECIMAL(30, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `lawn` ADD COLUMN `corporateCharges` DECIMAL(30, 2) NOT NULL DEFAULT 0.00;

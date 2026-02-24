-- AlterTable
ALTER TABLE `messingcategory` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `messingitem` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `messingsubcategory` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

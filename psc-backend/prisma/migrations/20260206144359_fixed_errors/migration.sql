-- DropForeignKey
ALTER TABLE `hallcancellationrequest` DROP FOREIGN KEY `HallCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `lawncancellationrequest` DROP FOREIGN KEY `LawnCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `photoshootcancellationrequest` DROP FOREIGN KEY `PhotoshootCancellationRequest_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `roomcancellationrequest` DROP FOREIGN KEY `RoomCancellationRequest_bookingId_fkey`;

-- DropIndex
DROP INDEX `HallCancellationRequest_bookingId_key` ON `hallcancellationrequest`;

-- DropIndex
DROP INDEX `LawnCancellationRequest_bookingId_key` ON `lawncancellationrequest`;

-- DropIndex
DROP INDEX `PhotoshootCancellationRequest_bookingId_key` ON `photoshootcancellationrequest`;

-- DropIndex
DROP INDEX `RoomCancellationRequest_bookingId_key` ON `roomcancellationrequest`;

-- CreateIndex
CREATE INDEX `HallCancellationRequest_status_idx` ON `HallCancellationRequest`(`status`);

-- CreateIndex
CREATE INDEX `LawnCancellationRequest_status_idx` ON `LawnCancellationRequest`(`status`);

-- CreateIndex
CREATE INDEX `PhotoshootCancellationRequest_status_idx` ON `PhotoshootCancellationRequest`(`status`);

-- CreateIndex
CREATE INDEX `RoomCancellationRequest_status_idx` ON `RoomCancellationRequest`(`status`);


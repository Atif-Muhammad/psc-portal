-- AlterTable
ALTER TABLE `member` MODIFY `Status` VARCHAR(191) NOT NULL;

-- Map old values to new values
UPDATE `member` SET `Status` = 'CLEAR' WHERE `Status` = 'ACTIVE';
UPDATE `member` SET `Status` = 'SUSPENDED' WHERE `Status` = 'DEACTIVATED';
UPDATE `member` SET `Status` = 'TERMINATED' WHERE `Status` = 'BLOCKED';

-- Update any other unknown values to CLEAR (optional safety net)
UPDATE `member` SET `Status` = 'CLEAR' WHERE `Status` NOT IN ('ABSENT', 'CANCELLED', 'CLEAR', 'DEFAULTER', 'DIED', 'HONORARY', 'SUSPENDED', 'TERMINATED');

-- Apply new Enum
ALTER TABLE `member` MODIFY `Status` ENUM('ABSENT', 'CANCELLED', 'CLEAR', 'DEFAULTER', 'DIED', 'HONORARY', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'CLEAR';

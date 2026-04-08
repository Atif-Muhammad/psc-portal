import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RoomReportsController } from './room-reports.controller';
import { HallReportsController } from './hall-reports.controller';
import { PhotoshootReportsController } from './photoshoot-reports.controller';
import { RoomReportsService } from './room-reports.service';
import { HallReportsService } from './hall-reports.service';
import { PhotoshootReportsService } from './photoshoot-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RoomReportsController,
    HallReportsController,
    PhotoshootReportsController,
  ],
  providers: [RoomReportsService, HallReportsService, PhotoshootReportsService],
})
export class ReportsModule {}

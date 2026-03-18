import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BookingModule } from 'src/booking/booking.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ThrottleGuard } from 'src/common/guards/throttler.guard';

@Module({
  imports: [PrismaModule, BookingModule, CloudinaryModule],
  controllers: [AdminController],
  providers: [AdminService, ThrottleGuard],
})
export class AdminModule {}

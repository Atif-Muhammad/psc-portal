import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BookingModule } from 'src/booking/booking.module';
import { MemberModule } from 'src/member/member.module';

@Module({
  imports:[PrismaModule, BookingModule, MemberModule],
  controllers: [PaymentController],
  providers: [PaymentService]
})
export class PaymentModule {}

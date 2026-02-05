import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BookingModule } from 'src/booking/booking.module';
import { MemberModule } from 'src/member/member.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    PrismaModule,
    BookingModule,
    MemberModule,
    RealtimeModule,
    NotificationModule,
    MailerModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule { }

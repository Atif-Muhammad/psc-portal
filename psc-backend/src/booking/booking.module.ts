import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ContentModule } from 'src/content/content.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [PrismaModule, ContentModule, NotificationModule, MailerModule],
  controllers: [BookingController, SearchController],
  providers: [BookingService, SearchService],
  exports: [BookingService, SearchService],
})
export class BookingModule { }

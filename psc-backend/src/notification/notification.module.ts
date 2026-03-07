import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FirebaseProvider } from './firebase.provider';
import { ContentModule } from 'src/content/content.module';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [PrismaModule, ContentModule, MailerModule],
  controllers: [NotificationController],
  providers: [NotificationService, FirebaseProvider],
  exports: [NotificationService],
})
export class NotificationModule { }

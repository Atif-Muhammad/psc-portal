import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dtos/notification';
import { v4 as uuid } from 'uuid';
import { MemberStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { ContentService } from 'src/content/content.service';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly contentService: ContentService,
  ) { }

  @UseGuards(JwtAccGuard)
  @Post('send-msg')
  async enqueueNotification(
    @Body('payload') payload: NotificationDto,
    @Req() req: any,
  ) {
    const allEmails = new Map<string, any>();

    // Helper to add emails to the map
    const addEmails = (list: any[]) => {
      list.forEach((e) => {
        if (e.Email) allEmails.set(e.Email, e);
      });
    };

    if (payload.sendToAll) {
      const list = await this.notificationService.getEmailsAll('ALL');
      addEmails(list);
    } else {
      // Check target statuses
      const targetStatuses = payload.targetStatuses
        ? [...payload.targetStatuses]
        : [];

      if (payload.isAnnouncement && !targetStatuses.includes('active')) {
        targetStatuses.push('active');
      }

      if (targetStatuses.length > 0) {
        for (const status of targetStatuses) {
          const list = await this.notificationService.getEmailsByStatus(
            status as MemberStatus,
          );
          addEmails(list);
        }
      }

      // Check manual recipients
      if (Array.isArray(payload.recipients) && payload.recipients.length > 0) {
        const list = await this.notificationService.getEmails(
          payload.recipients,
        );
        addEmails(list);
      }
    }

    // create notification for member sno
    const adminName = req.user?.name || 'system';
    const noti_created = await this.notificationService.createNoti(
      {
        title: payload.title,
        description: payload.description,
      },
      adminName,
    );

    if (payload.isAnnouncement) {
      await this.contentService.createAnnouncement(
        {
          title: payload.title,
          description: payload.description,
          date: new Date(),
          isActive: true,
        },
        adminName,
      );
    }

    for (const [emailStr, emailObj] of allEmails) {
      await this.notificationService.enqueue({
        id: uuid(),
        status: 'PENDING',
        noti_created: noti_created.id,
        recipient: emailStr,
      });
    }
  }

  @Get('notifications')
  async getNotifications() {
    return this.notificationService.getNotifications();
  }

  @Patch('update-seen')
  async updateSeen(@Body('notiID', ParseIntPipe) notiID: number) {
    return this.notificationService.updateSeen(notiID);
  }
}

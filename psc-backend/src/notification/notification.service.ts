import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { QueueMessage, QueueMeta, QueueStatus } from './types';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('FIREBASE_ADMIN') private readonly firebase: typeof admin,
  ) { }

  private readonly DATA_DIR = path.join(process.cwd(), 'data', 'notification');

  private readonly META_FILE = path.join(this.DATA_DIR, 'queue.meta.json');

  private readonly QUEUE_FILE = path.join(this.DATA_DIR, 'queue.jsonl');
  private ensureDataDir() {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
  }

  private readonly defaultMeta: QueueMeta = {
    readOffset: 0,
    writeOffset: 0,
    totalMessages: 0,
    pendingCount: 0,
    processingCount: 0,
    doneCount: 0,
    failedCount: 0,
  };

  loadMeta(): QueueMeta {
    this.ensureDataDir();
    if (!fs.existsSync(this.META_FILE)) {
      this.saveMeta(this.defaultMeta);
      return { ...this.defaultMeta };
    }
    return JSON.parse(fs.readFileSync(this.META_FILE, 'utf8'));
  }

  saveMeta(meta: QueueMeta): void {
    this.ensureDataDir();
    fs.writeFileSync(this.META_FILE, JSON.stringify(meta, null, 2));
  }

  recalc(): void {
    const meta = this.loadMeta();

    if (!fs.existsSync(this.QUEUE_FILE)) {
      Object.assign(meta, this.defaultMeta);
      this.saveMeta(meta);
      return;
    }

    const raw = fs.readFileSync(this.QUEUE_FILE, 'utf8').trim();
    if (!raw) {
      Object.assign(meta, this.defaultMeta);
      this.saveMeta(meta);
      return;
    }

    const lines: QueueMessage[] = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    meta.totalMessages = lines.length;
    meta.pendingCount = 0;
    meta.processingCount = 0;
    meta.doneCount = 0;
    meta.failedCount = 0;

    // Calculate readOffset based on contiguous DONE items from the start
    let newReadOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].status === 'DONE') {
        newReadOffset = i + 1;
      } else {
        break;
      }
    }
    meta.readOffset = newReadOffset;

    for (const msg of lines) {
      if (msg.status === 'PENDING') meta.pendingCount++;
      else if (msg.status === 'PROCESSING') meta.processingCount++;
      else if (msg.status === 'DONE') meta.doneCount++;
      else if (msg.status === 'FAILED') meta.failedCount++;
    }

    // Cleanup if all messages are processed (based on readOffset catching up to length)
    if (meta.readOffset === lines.length && lines.length > 0) {
      fs.writeFileSync(this.QUEUE_FILE, '');
      Object.assign(meta, this.defaultMeta);
    }

    this.saveMeta(meta);
  }

  enqueue(msg: QueueMessage): void {
    const meta = this.loadMeta();

    msg.status = msg.status === 'PROCESSING' ? 'FAILED' : 'PENDING';

    let lines: QueueMessage[] = [];
    if (fs.existsSync(this.QUEUE_FILE)) {
      const raw = fs.readFileSync(this.QUEUE_FILE, 'utf8').trim();
      if (raw) {
        lines = raw.split('\n').map((line) => JSON.parse(line));
      }
    }

    const exists = lines.some((l) => l.id === msg.id);
    lines = lines.filter((l) => l.id !== msg.id);
    lines.push(msg);

    if (!exists) {
      meta.writeOffset++;
      this.saveMeta(meta);
    }

    fs.writeFileSync(
      this.QUEUE_FILE,
      lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
    );

    this.recalc();
  }

  dequeue(): QueueMessage | null {
    if (!fs.existsSync(this.QUEUE_FILE)) return null;

    const raw = fs.readFileSync(this.QUEUE_FILE, 'utf8').trim();
    if (!raw) return null;

    const meta = this.loadMeta();

    const lines: QueueMessage[] = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    for (let i = meta.readOffset; i < lines.length; i++) {
      const msg = lines[i];

      if (
        msg.status === 'PENDING' ||
        (msg.status === 'FAILED' && (msg.tries ?? 0) < 10)
      ) {
        msg.status = 'PROCESSING';
        msg.tries = (msg.tries ?? 0) + 1;
        lines[i] = msg;

        fs.writeFileSync(
          this.QUEUE_FILE,
          lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
        );

        this.recalc();
        return msg;
      }
    }

    return null;
  }

  updateStatus(id: string, status: QueueStatus): void {
    if (!fs.existsSync(this.QUEUE_FILE)) return;

    let lines: QueueMessage[] = fs
      .readFileSync(this.QUEUE_FILE, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    if (status === 'DONE') {
      lines = lines.filter((msg) => msg.id !== id);
    } else {
      lines = lines.map((msg) => (msg.id === id ? { ...msg, status } : msg));
    }

    fs.writeFileSync(
      this.QUEUE_FILE,
      lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
    );

    this.recalc();
  }

  async getNotifications() {
    return await this.prisma.notification.findMany({
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getEmails(ids: string[]) {
    return await this.prisma.member.findMany({
      where: {
        Membership_No: {
          in: ids,
        },
      },
      select: {
        Email: true,
      },
    });
  }
  async getEmailsAll(recp: MemberStatus | 'ALL') {
    if (recp === 'ALL') {
      return await this.prisma.member.findMany({
        select: {
          Email: true,
        },
      });
    }
    return await this.prisma.member.findMany({
      where: {
        Status: recp,
      },
      select: {
        Email: true,
      },
    });
  }
  async getEmailsByStatus(status: string = 'active') {
    const upperStatus = status.toUpperCase();
    const derivedStatuses = ['ACTIVE', 'DEACTIVATED', 'BLOCKED'];

    const where: any = {};
    if (derivedStatuses.includes(upperStatus)) {
      where.Status = status.toLowerCase();
    } else {
      where.Actual_Status = upperStatus as MemberStatus;
    }

    return await this.prisma.member.findMany({
      where,
      select: {
        Email: true,
      },
    });
  }

  async createNoti(
    noti: { title: string; description: string },
    createdBy: string,
  ) {
    return await this.prisma.notification.create({
      data: {
        title: noti.title,
        description: noti.description,
        delivered: false,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async sendNoti() {
    const noti = await this.dequeue();
    if (!noti) return;
    if (noti?.status === 'DONE') {
      return;
    }
    const member = await this.prisma.member.findUnique({
      where: {
        Email: noti?.recipient,
      },
      select: {
        Membership_No: true,
        FCMToken: true,
      },
    });
    if (!member) {
      return;
    }

    // Fetch notification details for title/body
    const notificationRecord = await this.prisma.notification.findUnique({
      where: { id: noti.noti_created },
    });

    // Send FCM if token exists
    if (member.FCMToken && notificationRecord) {
      try {
        const response = await this.firebase.messaging().sendEachForMulticast({
          tokens: [member.FCMToken],
          notification: {
            title: notificationRecord.title,
            body: notificationRecord.description ?? '',
          },
          // ADD THIS BLOCK:
          android: {
            priority: 'high',
            notification: {
              channelId: 'psc_default_channel', // MUST match the ID in MainApplication.kt
              priority: 'high',
              defaultSound: true,
              visibility: 'public',
            },
          },
          data: {
            notificationId: String(notificationRecord.id),
            type: 'general',
          },
        });

        // 🧹 Clean invalid tokens
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            console.error(
              'FCM failed:',
              r.error?.message,
              'token:',
              member.FCMToken,
            );
          }
        });
      } catch (error) {
        console.error(`Failed to send FCM to ${noti.recipient}:`, error);
      }
    }

    // create deliverednotis
    await this.prisma.deliveredNotis.create({
      data: {
        notificationId: noti?.noti_created,
        member: member.Membership_No,
      },
    });

    // update notification status to delivered
    await this.prisma.notification.update({
      where: {
        id: noti?.noti_created,
      },
      data: {
        delivered: true,
      },
    });

    // Mark as DONE in queue (which removes it)
    this.updateStatus(noti.id, 'DONE');
  }

  async getMemberNotifications(membershipNo: string) {
    return await this.prisma.notification.findMany({
      where: {
        deliveries: {
          some: {
            member: membershipNo,
          },
        },
      },
      include: {
        deliveries: {
          where: {
            member: membershipNo,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async getUnseenNotificationsCount(membershipNo: string) {
    return await this.prisma.notification.count({
      where: {
        deliveries: {
          some: {
            AND: [
              { member: membershipNo },
              { seen: false }
            ]
          },
        },
      },
    });
  }

  async updateSeen(notiID: number) {
    return await this.prisma.deliveredNotis.update({
      where: {
        id: notiID,
      },
      data: {
        seen: true,
      },
    });
  }
}

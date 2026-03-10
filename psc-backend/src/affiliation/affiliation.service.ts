import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import {
  CreateAffiliatedClubDto,
  UpdateAffiliatedClubDto,
  CreateAffiliatedClubRequestDto,
} from './dtos/affiliation.dto';
import { MailerService } from 'src/mailer/mailer.service';
import { createRequestEmailContent } from 'src/utils/messages';

@Injectable()
export class AffiliationService {
  constructor(
    private prismaService: PrismaService,
    private mailerService: MailerService,
    private cloudinary: CloudinaryService,
  ) { }



  // -------------------- AFFILIATED CLUBS --------------------

  async getAffiliatedClubs() {
    return await this.prismaService.affiliatedClub.findMany({
      orderBy: { order: 'asc' },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAffiliatedClubsActive() {
    return await this.prismaService.affiliatedClub.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAffiliatedClubById(id: number) {
    const club = await this.prismaService.affiliatedClub.findUnique({
      where: { id: Number(id) },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!club) {
      throw new HttpException(
        'Affiliated club not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return club;
  }

  async createAffiliatedClub(
    payload: CreateAffiliatedClubDto,
    createdBy: string,
    file?: Express.Multer.File,
  ) {
    let imageUrl = null;
    if (file) {
      const upload = await this.cloudinary.uploadFile(file);
      imageUrl = upload.url;
    }

    return await this.prismaService.affiliatedClub.create({
      data: {
        name: payload.name,
        location: payload.location,
        contactNo: payload.contactNo,
        email: payload.email,
        description: payload.description,
        image: imageUrl ?? null,
        isActive: payload.isActive ?? true,
        order: Number(payload.order) || 0,
        createdBy,
        updatedBy: createdBy,
      },
    });
  }

  async updateAffiliatedClub(
    payload: UpdateAffiliatedClubDto,
    updatedBy: string,
    file?: Express.Multer.File,
  ) {
    if (!payload.id) {
      throw new HttpException(
        'Affiliated club ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if club exists
    await this.getAffiliatedClubById(payload.id);

    let imageUrl = payload.image; // Keep existing if not replaced
    if (file) {
      const upload = await this.cloudinary.uploadFile(file);
      imageUrl = upload.url;
    }

    return await this.prismaService.affiliatedClub.update({
      where: { id: Number(payload.id) },
      data: {
        name: payload.name,
        location: payload.location,
        contactNo: payload.contactNo,
        email: payload.email,
        description: payload.description,
        image: imageUrl ?? null,
        isActive: payload.isActive,
        order: payload.order !== undefined ? Number(payload.order) : undefined,
        updatedBy,
      },
    });
  }

  async deleteAffiliatedClub(id: number) {
    if (!id) {
      throw new HttpException(
        'Affiliated club ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if club exists
    await this.getAffiliatedClubById(id);

    return await this.prismaService.affiliatedClub.delete({
      where: { id: Number(id) },
    });
  }

  // -------------------- AFFILIATED CLUB REQUESTS --------------------

  async getAffiliatedClubRequests(from?: string, to?: string, clubId?: number) {
    const where: any = {};
    if (clubId) where.affiliatedClubId = clubId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    return await this.prismaService.affiliatedClubRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        affiliatedClub: true,
      },
    });
  }

  async getRequestById(id: number) {
    const request = await this.prismaService.affiliatedClubRequest.findUnique({
      where: { id: Number(id) },
      include: {
        affiliatedClub: true,
      },
    });

    if (!request) {
      throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
    }

    return request;
  }

  async createRequest(
    payload: CreateAffiliatedClubRequestDto,
    createdBy: string = 'member',
  ) {
    // Check if club exists
    const club = await this.prismaService.affiliatedClub.findFirst({
      where: { id: payload.affiliatedClubId },
      select: { email: true, name: true },
    });
    if (!club) {
      throw new HttpException('Club not found', HttpStatus.NOT_FOUND);
    }

    // Check if member exists
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: payload.membershipNo.toString() },
      select: {
        Email: true,
        Name: true,
        Membership_No: true,
        Contact_No: true,
      },
    });
    if (!member) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }

    const request = await this.prismaService.affiliatedClubRequest.create({
      data: {
        membershipNo: payload.membershipNo.toString(),
        affiliatedClubId: payload.affiliatedClubId,
        requestedDate: new Date(payload.requestedDate),
        createdBy,
        updatedBy: createdBy,
      },
      include: {
        affiliatedClub: true,
      },
    });

    // Send email after request is created so we have the ID
    this.sendRequestEmail(member.Email!, club, request).catch(err => {
      console.error('Failed to send affiliation request email:', err);
    });

    return request;
  }

  private async sendRequestEmail(member: string, club: any, request: any) {
    const message = createRequestEmailContent(member, club, request);
    await this.mailerService.sendMail(
      club.email,
      [member, process.env.NODEMAILER_USER],
      `New Visit Request - ${club.name}`,
      message,
    );
  }

  async getAffiliatedClubStats(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const stats = await this.prismaService.affiliatedClubRequest.groupBy({
      by: ['affiliatedClubId'],
      where,
      _count: {
        id: true,
      },
    });

    const clubs = await this.prismaService.affiliatedClub.findMany({
      where: {
        id: { in: stats.map((s) => s.affiliatedClubId) },
      },
      select: { id: true, name: true },
    });

    return stats
      .map((stat) => ({
        clubName:
          clubs.find((c) => c.id === stat.affiliatedClubId)?.name || 'Unknown',
        requestCount: stat._count.id,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);
  }

  async getAffiliatedBookingStats(from?: string, to?: string) {
    const where: any = {
      isCancelled: false,
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const bookings = await this.prismaService.affClubBooking.findMany({
      where,
      select: {
        affiliatedClubId: true,
        totalPrice: true,
        paidAmount: true,
        pendingAmount: true,
        paymentStatus: true,
      },
    });

    const clubs = await this.prismaService.affiliatedClub.findMany({
      where: {
        id: { in: [...new Set(bookings.map((b) => b.affiliatedClubId))] },
      },
      select: { id: true, name: true },
    });

    const statsMap = new Map<number, any>();

    bookings.forEach((booking) => {
      let clubStats = statsMap.get(booking.affiliatedClubId);
      if (!clubStats) {
        clubStats = {
          clubName: clubs.find((c) => c.id === booking.affiliatedClubId)?.name || 'Unknown',
          bookingCount: 0,
          totalRevenue: 0,
          totalPaid: 0,
          totalPending: 0,
          paidBookingsCount: 0,
          paidAmountTotal: 0,
          unpaidBookingsCount: 0,
          unpaidAmountTotal: 0,
          halfPaidBookingsCount: 0,
          halfPaidAmountTotal: 0,
          advancePaidBookingsCount: 0,
          advancePaidAmountTotal: 0,
        };
        statsMap.set(booking.affiliatedClubId, clubStats);
      }

      clubStats.bookingCount++;
      clubStats.totalRevenue += Number(booking.totalPrice) || 0;
      clubStats.totalPaid += Number(booking.paidAmount) || 0;
      clubStats.totalPending += Number(booking.pendingAmount) || 0;

      const status = String(booking.paymentStatus);
      const paid = Number(booking.paidAmount) || 0;

      if (status === 'PAID') {
        clubStats.paidBookingsCount++;
        clubStats.paidAmountTotal += paid;
      } else if (status === 'UNPAID') {
        clubStats.unpaidBookingsCount++;
        clubStats.unpaidAmountTotal += paid;
      } else if (status === 'HALF_PAID') {
        clubStats.halfPaidBookingsCount++;
        clubStats.halfPaidAmountTotal += paid;
      } else if (status === 'ADVANCE_PAYMENT') {
        clubStats.advancePaidBookingsCount++;
        clubStats.advancePaidAmountTotal += paid;
      }
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }


  // -------------------- AFFILIATED CLUB ROOM BOOKINGS --------------------

  async getAffiliatedRoomBookings(page = 1, limit = 10, clubId?: number, status?: 'ACTIVE' | 'CANCELLED' | 'REQUESTS' | 'CLOSED') {
    const where: any = {};
    if (clubId) where.affiliatedClubId = clubId;

    if (status === 'ACTIVE') {
      where.isCancelled = false;
      where.isClosed = false;
      where.cancellationRequests = {
        none: { status: 'PENDING' },
      };
    } else if (status === 'CANCELLED') {
      where.isCancelled = true;
    } else if (status === 'REQUESTS') {
      // Fetch NON-CANCELLED bookings that have PENDING cancellation requests
      where.isCancelled = false;
      where.cancellationRequests = {
        some: { status: 'PENDING' },
      };
    } else if (status === 'CLOSED') {
      where.isClosed = true;
      where.isCancelled = false;
    }

    const [total, data] = await Promise.all([
      this.prismaService.affClubBooking.count({ where }),
      this.prismaService.affClubBooking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          affiliatedClub: true,
          cancellationRequests: true,
          rooms: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}

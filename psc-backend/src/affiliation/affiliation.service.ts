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
import { createRequestEmailContent } from 'src/common/utils/messages';

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

    const mailSent = this.sendRequestEmail(member.Email!, club, payload);
    if (!mailSent) {
      throw new HttpException(
        'Mail not sent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return await this.prismaService.affiliatedClubRequest.create({
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
}

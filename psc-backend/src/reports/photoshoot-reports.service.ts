import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PhotoshootBookingReportDto } from './dtos/photoshoot-report.dto';

@Injectable()
export class PhotoshootReportsService {
  constructor(private prisma: PrismaService) {}

  async getPhotoshootBookings(query: {
    fromDate?: string;
    toDate?: string;
    bookedBy?: string;
    memberNumber?: string;
    canceledBy?: string;
    bookedFor?: string;
  }): Promise<PhotoshootBookingReportDto[]> {
    const { fromDate, toDate, bookedBy, memberNumber, canceledBy, bookedFor } =
      query;

    let fromDateParsed: Date | undefined;
    let toDateParsed: Date | undefined;

    if (fromDate) {
      fromDateParsed = new Date(fromDate);
      if (isNaN(fromDateParsed.getTime())) {
        throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
      }
    }

    if (toDate) {
      toDateParsed = new Date(toDate);
      if (isNaN(toDateParsed.getTime())) {
        throw new BadRequestException(`Invalid toDate format: ${toDate}`);
      }
      toDateParsed.setHours(23, 59, 59, 999);
    }

    const where: any = {};

    if (fromDateParsed || toDateParsed) {
      where.bookingDate = {};
      if (fromDateParsed) where.bookingDate.gte = fromDateParsed;
      if (toDateParsed) where.bookingDate.lte = toDateParsed;
    }

    if (bookedBy) {
      if (bookedBy === 'APP') {
        where.createdBy = 'APP';
      } else if (bookedBy === 'ADMIN') {
        where.createdBy = { not: 'APP' };
      } else {
        where.createdBy = bookedBy;
      }
    }
    if (bookedFor) where.guestName = { contains: bookedFor };

    if (memberNumber) {
      where.member = { Membership_No: memberNumber };
    }

    if (canceledBy) {
      where.cancellationRequests = {
        some: { requestedBy: { contains: canceledBy } },
      };
    }

    const bookings = await this.prisma.photoshootBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { Name: true, Membership_No: true } },
        photoshoot: { select: { description: true } },
      },
    });

    return bookings.map((b) => this.mapToDto(b));
  }

  private mapToDto(booking: any): PhotoshootBookingReportDto {
    let bookingStatus = 'BOOKED';
    if (booking.isCancelled) bookingStatus = 'CANCELED';
    else if (booking.isClosed) bookingStatus = 'CLOSED';

    const timeSlot =
      booking.startTime && booking.endTime
        ? `${booking.startTime} - ${booking.endTime}`
        : (booking.startTime ?? '');

    const dto = new PhotoshootBookingReportDto();
    dto.id = booking.id;
    dto.memberName = booking.member?.Name ?? booking.guestName ?? '';
    dto.memberNumber = booking.member?.Membership_No ?? '';
    dto.packageDescription = booking.photoshoot?.description ?? '';
    dto.date = new Date(booking.bookingDate).toISOString().split('T')[0];
    dto.timeSlot = timeSlot;
    dto.charges = Number(booking.totalPrice ?? 0);
    dto.paymentStatus = booking.paymentStatus ?? '';
    dto.bookingStatus = bookingStatus;
    dto.bookedBy = booking.createdBy ?? '';
    return dto;
  }
}

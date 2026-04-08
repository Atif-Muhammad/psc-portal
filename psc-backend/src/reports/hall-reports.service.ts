import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HallBookingReportDto, HallDailyCheckoutDto, HallMonthlyGridDto } from './dtos/hall-report.dto';

@Injectable()
export class HallReportsService {
  constructor(private prisma: PrismaService) {}

  async getHallBookings(query: {
    venueType?: string;
    venueId?: string;
    eventType?: string;
    timeSlot?: string;
    bookingStatus?: string;
    paymentStatus?: string;
    fromDate?: string;
    toDate?: string;
    bookedBy?: string;
    memberNumber?: string;
    canceledBy?: string;
    bookedFor?: string;
  }): Promise<HallBookingReportDto[]> {
    const {
      venueType,
      venueId,
      eventType,
      timeSlot,
      bookingStatus,
      paymentStatus,
      fromDate,
      toDate,
      bookedBy,
      memberNumber,
      canceledBy,
      bookedFor,
    } = query;

    // Validate date formats
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

    const results: HallBookingReportDto[] = [];

    const queryHalls = !venueType || venueType.toUpperCase() === 'HALL';
    const queryLawns = !venueType || venueType.toUpperCase() === 'LAWN';

    // ── HALL BOOKINGS ──────────────────────────────────────────────────────────
    if (queryHalls) {
      const where: any = {};

      if (bookingStatus) {
        if (bookingStatus === 'CANCELED') {
          where.isCancelled = true;
        } else if (bookingStatus === 'CLOSED') {
          where.isClosed = true;
          where.isCancelled = false;
        } else if (bookingStatus === 'BOOKED') {
          where.isCancelled = false;
          where.isClosed = false;
        }
      }

      if (paymentStatus) where.paymentStatus = paymentStatus;

      if (fromDateParsed || toDateParsed) {
        where.bookingDate = {};
        if (fromDateParsed) where.bookingDate.gte = fromDateParsed;
        if (toDateParsed) where.bookingDate.lte = toDateParsed;
      }

      if (eventType) where.eventType = { contains: eventType };
      if (timeSlot) where.bookingTime = timeSlot.toUpperCase();
      if (bookedBy) {
        if (bookedBy === 'APP') where.createdBy = 'APP';
        else if (bookedBy === 'ADMIN') where.createdBy = { not: 'APP' };
        else where.createdBy = bookedBy;
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

      if (venueId) where.hallId = Number(venueId);

      const hallBookings = await this.prisma.hallBooking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { Name: true, Membership_No: true } },
          hall: { select: { name: true } },
        },
      });

      for (const b of hallBookings) {
        results.push(this.mapHallToDto(b));
      }
    }

    // ── LAWN BOOKINGS ──────────────────────────────────────────────────────────
    if (queryLawns) {
      const where: any = {};

      if (bookingStatus) {
        if (bookingStatus === 'CANCELED') {
          where.isCancelled = true;
        } else if (bookingStatus === 'CLOSED') {
          where.isClosed = true;
          where.isCancelled = false;
        } else if (bookingStatus === 'BOOKED') {
          where.isCancelled = false;
          where.isClosed = false;
        }
      }

      if (paymentStatus) where.paymentStatus = paymentStatus;

      if (fromDateParsed || toDateParsed) {
        where.bookingDate = {};
        if (fromDateParsed) where.bookingDate.gte = fromDateParsed;
        if (toDateParsed) where.bookingDate.lte = toDateParsed;
      }

      if (eventType) where.eventType = { contains: eventType };
      if (timeSlot) where.bookingTime = timeSlot.toUpperCase();
      if (bookedBy) {
        if (bookedBy === 'APP') where.createdBy = 'APP';
        else if (bookedBy === 'ADMIN') where.createdBy = { not: 'APP' };
        else where.createdBy = bookedBy;
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

      if (venueId) where.lawnId = Number(venueId);

      const lawnBookings = await this.prisma.lawnBooking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { Name: true, Membership_No: true } },
          lawn: {
            include: {
              lawnCategory: { select: { category: true } },
            },
          },
        },
      });

      for (const b of lawnBookings) {
        results.push(this.mapLawnToDto(b));
      }
    }

    return results;
  }

  async getDailyCheckout(date: string): Promise<HallDailyCheckoutDto> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid date format: ${date}`);
    }

    // Normalize to start of day (UTC)
    const dayStart = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    // Opening balance: sum of closed hall + lawn bookings strictly before this date
    const [hallPrior, lawnPrior] = await Promise.all([
      this.prisma.hallBooking.aggregate({
        _sum: { totalPrice: true },
        where: { isClosed: true, bookingDate: { lt: dayStart } },
      }),
      this.prisma.lawnBooking.aggregate({
        _sum: { totalPrice: true },
        where: { isClosed: true, bookingDate: { lt: dayStart } },
      }),
    ]);

    const openingBalance =
      Number(hallPrior._sum.totalPrice ?? 0) +
      Number(lawnPrior._sum.totalPrice ?? 0);

    // Daily entries: closed hall bookings on this date
    const [hallBookings, lawnBookings] = await Promise.all([
      this.prisma.hallBooking.findMany({
        where: { isClosed: true, bookingDate: { gte: dayStart, lt: dayEnd } },
        include: {
          member: { select: { Name: true } },
          hall: { select: { name: true } },
        },
        orderBy: { bookingDate: 'asc' },
      }),
      this.prisma.lawnBooking.findMany({
        where: { isClosed: true, bookingDate: { gte: dayStart, lt: dayEnd } },
        include: {
          member: { select: { Name: true } },
          lawn: {
            include: { lawnCategory: { select: { category: true } } },
          },
        },
        orderBy: { bookingDate: 'asc' },
      }),
    ]);

    const entries: HallDailyCheckoutDto['entries'] = [];

    for (const b of hallBookings) {
      entries.push(this.mapToCheckoutEntry(b, b.hall?.name ?? ''));
    }

    for (const b of lawnBookings) {
      const lawnName = b.lawn?.lawnCategory?.category
        ? `${b.lawn.lawnCategory.category}${(b.lawn as any).description ? ' - ' + (b.lawn as any).description : ''}`
        : ((b.lawn as any)?.description ?? '');
      entries.push(this.mapToCheckoutEntry(b, lawnName));
    }

    const entriesTotalSum = entries.reduce((sum, e) => sum + e.total, 0);
    const accumulativeTotal = openingBalance + entriesTotalSum;

    return { openingBalance, entries, accumulativeTotal };
  }

  async getMonthlyGrid(fromDate: string, toDate: string): Promise<HallMonthlyGridDto> {
    if (!fromDate) throw new BadRequestException('fromDate is required');
    if (!toDate) throw new BadRequestException('toDate is required');

    const from = new Date(fromDate);
    if (isNaN(from.getTime())) {
      throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
    }

    const to = new Date(toDate);
    if (isNaN(to.getTime())) {
      throw new BadRequestException(`Invalid toDate format: ${toDate}`);
    }
    to.setHours(23, 59, 59, 999);

    const [hallBookings, lawnBookings] = await Promise.all([
      this.prisma.hallBooking.findMany({
        where: {
          isClosed: true,
          isCancelled: false,
          bookingDate: { gte: from, lte: to },
        },
        include: { hall: { select: { name: true } } },
        orderBy: { bookingDate: 'asc' },
      }),
      this.prisma.lawnBooking.findMany({
        where: {
          isClosed: true,
          isCancelled: false,
          bookingDate: { gte: from, lte: to },
        },
        include: {
          lawn: {
            include: { lawnCategory: { select: { category: true } } },
          },
        },
        orderBy: { bookingDate: 'asc' },
      }),
    ]);

    // venue key -> { name, type, days }
    const venueMap = new Map<string, { name: string; type: string; days: Record<number, string> }>();

    for (const b of hallBookings) {
      const name = b.hall?.name ?? `Hall #${b.hallId}`;
      const key = `HALL:${name}`;
      if (!venueMap.has(key)) venueMap.set(key, { name, type: 'HALL', days: {} });
      const day = new Date(b.bookingDate).getUTCDate();
      venueMap.get(key)!.days[day] = (b as any).bookingTime ?? '';
    }

    for (const b of lawnBookings) {
      const lawnName = b.lawn?.lawnCategory?.category
        ? `${b.lawn.lawnCategory.category}${(b.lawn as any).description ? ' - ' + (b.lawn as any).description : ''}`
        : ((b.lawn as any)?.description ?? `Lawn #${b.lawnId}`);
      const key = `LAWN:${lawnName}`;
      if (!venueMap.has(key)) venueMap.set(key, { name: lawnName, type: 'LAWN', days: {} });
      const day = new Date(b.bookingDate).getUTCDate();
      venueMap.get(key)!.days[day] = (b as any).bookingTime ?? '';
    }

    const venues = Array.from(venueMap.values()).map((v) => ({
      name: v.name,
      type: v.type,
      days: v.days,
      total: Object.keys(v.days).length,
    }));

    // dailyTotals: count of venues booked per day
    const dailyTotals: Record<number, number> = {};
    for (const v of venues) {
      for (const day of Object.keys(v.days)) {
        const d = Number(day);
        dailyTotals[d] = (dailyTotals[d] ?? 0) + 1;
      }
    }

    return { venues, dailyTotals };
  }

  private mapToCheckoutEntry(
    booking: any,
    hallName: string,
  ): HallDailyCheckoutDto['entries'][number] {
    const extraCharges: { head: string; amount: number }[] =
      Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    const getCharge = (head: string) =>
      extraCharges
        .filter((c) => c.head === head)
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const food = getCharge('Food');
    const gst = getCharge('GST');
    const serviceCharge = getCharge('SVC');
    const total = Number(booking.totalPrice);
    const rent = total - food - gst - serviceCharge;

    const eventDate = new Date(booking.bookingDate).toISOString().split('T')[0];

    return {
      hallName,
      contactPersonName: booking.member?.Name ?? booking.guestName ?? '',
      from: eventDate,
      to: eventDate,
      days: 1,
      rent,
      serviceCharge,
      gst,
      food,
      total,
    };
  }

  private mapHallToDto(booking: any): HallBookingReportDto {
    const extraCharges: { head: string; amount: number }[] =
      Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    const getCharge = (head: string) =>
      extraCharges
        .filter((c) => c.head === head)
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const food = getCharge('Food');
    const gst = getCharge('GST');
    const serviceCharge = getCharge('SVC');
    const total = Number(booking.totalPrice);
    const rent = total - food - gst - serviceCharge;

    let bookingStatus = 'BOOKED';
    if (booking.isCancelled) bookingStatus = 'CANCELED';
    else if (booking.isClosed) bookingStatus = 'CLOSED';

    const dto = new HallBookingReportDto();
    dto.id = booking.id;
    dto.venueName = booking.hall?.name ?? '';
    dto.venueType = 'HALL';
    dto.memberName = booking.member?.Name ?? booking.guestName ?? '';
    dto.memberNumber = booking.member?.Membership_No ?? '';
    dto.eventDate = new Date(booking.bookingDate).toISOString().split('T')[0];
    dto.eventType = booking.eventType ?? '';
    dto.timeSlot = booking.bookingTime ?? '';
    dto.rent = rent;
    dto.serviceCharge = serviceCharge;
    dto.gst = gst;
    dto.food = food;
    dto.total = total;
    dto.paymentStatus = booking.paymentStatus ?? '';
    dto.bookingStatus = bookingStatus;
    dto.bookedBy = booking.createdBy ?? '';
    return dto;
  }

  private mapLawnToDto(booking: any): HallBookingReportDto {
    const extraCharges: { head: string; amount: number }[] =
      Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    const getCharge = (head: string) =>
      extraCharges
        .filter((c) => c.head === head)
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const food = getCharge('Food');
    const gst = getCharge('GST');
    const serviceCharge = getCharge('SVC');
    const total = Number(booking.totalPrice);
    const rent = total - food - gst - serviceCharge;

    let bookingStatus = 'BOOKED';
    if (booking.isCancelled) bookingStatus = 'CANCELED';
    else if (booking.isClosed) bookingStatus = 'CLOSED';

    const lawnName = booking.lawn?.lawnCategory?.category
      ? `${booking.lawn.lawnCategory.category}${booking.lawn.description ? ' - ' + booking.lawn.description : ''}`
      : (booking.lawn?.description ?? '');

    const dto = new HallBookingReportDto();
    dto.id = booking.id;
    dto.venueName = lawnName;
    dto.venueType = 'LAWN';
    dto.memberName = booking.member?.Name ?? booking.guestName ?? '';
    dto.memberNumber = booking.member?.Membership_No ?? '';
    dto.eventDate = new Date(booking.bookingDate).toISOString().split('T')[0];
    dto.eventType = booking.eventType ?? '';
    dto.timeSlot = booking.bookingTime ?? '';
    dto.rent = rent;
    dto.serviceCharge = serviceCharge;
    dto.gst = gst;
    dto.food = food;
    dto.total = total;
    dto.paymentStatus = booking.paymentStatus ?? '';
    dto.bookingStatus = bookingStatus;
    dto.bookedBy = booking.createdBy ?? '';
    return dto;
  }
}

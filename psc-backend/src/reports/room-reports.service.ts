import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomBookingReportDto, RoomCancellationReportDto, RoomDailyCheckoutDto, RoomMonthlyBillsDto, RoomMonthlyCheckoutDto, RoomSalesReportDto } from './dtos/room-report.dto';

@Injectable()
export class RoomReportsService {
  constructor(private prisma: PrismaService) {}

  async getRoomBookings(query: {
    bookingStatus?: string;
    paymentStatus?: string;
    fromDate?: string;
    toDate?: string;
    roomType?: string;
    roomId?: string;
    bookedBy?: string;
    memberNumber?: string;
    canceledBy?: string;
    bookedFor?: string;
  }): Promise<RoomBookingReportDto[]> {
    const {
      bookingStatus,
      paymentStatus,
      fromDate,
      toDate,
      roomType,
      roomId,
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
      // Set to end of day
      toDateParsed.setHours(23, 59, 59, 999);
    }

    // Build where clause
    const where: any = {};

    // bookingStatus filter
    if (bookingStatus) {
      if (bookingStatus === 'CANCELED') {
        where.isCancelled = true;
      } else if (bookingStatus === 'OCCUPIED') {
        where.isClosed = true;
        where.isCancelled = false;
      } else if (bookingStatus === 'BOOKED') {
        where.isCancelled = false;
        where.isClosed = false;
      }
    }

    // paymentStatus filter
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // date range filter on checkIn
    if (fromDateParsed || toDateParsed) {
      where.checkIn = {};
      if (fromDateParsed) where.checkIn.gte = fromDateParsed;
      if (toDateParsed) where.checkIn.lte = toDateParsed;
    }

    // memberNumber filter
    if (memberNumber) {
      where.Membership_No = memberNumber;
    }

    // bookedBy filter (maps to createdBy)
    // 'APP' = member self-service; 'ADMIN' = any admin (not APP)
    if (bookedBy) {
      if (bookedBy === 'APP') {
        where.createdBy = 'APP';
      } else if (bookedBy === 'ADMIN') {
        where.createdBy = { not: 'APP' };
      } else {
        where.createdBy = bookedBy;
      }
    }

    // bookedFor filter (maps to guestName)
    if (bookedFor) {
      where.guestName = { contains: bookedFor };
    }

    // canceledBy filter — filter via cancellationRequests relation
    if (canceledBy) {
      where.cancellationRequests = {
        some: { requestedBy: { contains: canceledBy } },
      };
    }

    // roomId / roomType filter — filter via rooms relation
    const roomsFilter: any = {};
    if (roomId) {
      roomsFilter.roomId = Number(roomId);
    }
    if (roomType) {
      roomsFilter.room = { roomType: { type: { contains: roomType } } };
    }
    if (Object.keys(roomsFilter).length > 0) {
      where.rooms = { some: roomsFilter };
    }

    const bookings = await this.prisma.roomBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { Name: true, Membership_No: true } },
        rooms: {
          include: {
            room: {
              include: {
                roomType: { select: { type: true } },
              },
            },
          },
        },
      },
    });

    return bookings.map((b) => this.mapToDto(b));
  }

  async getMonthlyCheckout(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RoomMonthlyCheckoutDto> {
    const { fromDate, toDate } = query;

    if (!fromDate) throw new BadRequestException('fromDate is required');
    if (!toDate) throw new BadRequestException('toDate is required');

    const fromDateParsed = new Date(fromDate);
    if (isNaN(fromDateParsed.getTime())) {
      throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
    }

    const toDateParsed = new Date(toDate);
    if (isNaN(toDateParsed.getTime())) {
      throw new BadRequestException(`Invalid toDate format: ${toDate}`);
    }
    toDateParsed.setHours(23, 59, 59, 999);

    // Query occupied bookings that overlap the date range
    const bookings = await this.prisma.roomBooking.findMany({
      where: {
        isClosed: true,
        isCancelled: false,
        checkIn: { lte: toDateParsed },
        checkOut: { gte: fromDateParsed },
      },
      include: {
        member: { select: { Name: true } },
        rooms: {
          include: {
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    if (bookings.length === 0) {
      return { rooms: [], dailyTotals: {} };
    }

    // Build a map: roomNumber -> { day -> occupantName }
    const roomDayMap = new Map<string, Map<number, string>>();

    for (const booking of bookings) {
      const occupantName =
        booking.member?.Name ?? booking.guestName ?? '';

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      // Clamp to the requested range
      const rangeStart = bookingCheckIn < fromDateParsed ? fromDateParsed : bookingCheckIn;
      const rangeEnd = bookingCheckOut > toDateParsed ? toDateParsed : bookingCheckOut;

      for (const roomOnBooking of booking.rooms) {
        const roomNumber = roomOnBooking.room?.roomNumber ?? '';
        if (!roomNumber) continue;

        if (!roomDayMap.has(roomNumber)) {
          roomDayMap.set(roomNumber, new Map());
        }
        const dayMap = roomDayMap.get(roomNumber)!;

        // Iterate each day in the overlap range (exclusive of checkout day)
        const cursor = new Date(rangeStart);
        cursor.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd);
        end.setHours(0, 0, 0, 0);

        while (cursor < end) {
          const dayOfMonth = cursor.getDate();
          dayMap.set(dayOfMonth, occupantName);
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    // Build dailyTotals: day -> count of occupied rooms
    const dailyTotals: Record<number, number> = {};
    for (const dayMap of roomDayMap.values()) {
      for (const day of dayMap.keys()) {
        dailyTotals[day] = (dailyTotals[day] ?? 0) + 1;
      }
    }

    // Build rooms array sorted by roomNumber
    const rooms = Array.from(roomDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([roomNumber, dayMap]) => {
        const days: Record<number, string> = {};
        for (const [day, name] of dayMap.entries()) {
          days[day] = name;
        }
        return {
          roomNumber,
          days,
          total: dayMap.size,
        };
      });

    return { rooms, dailyTotals };
  }

  async getDailyCheckout(query: { date?: string }): Promise<RoomDailyCheckoutDto> {
    const { date } = query;

    if (!date) throw new BadRequestException('date is required');

    const dateParsed = new Date(date);
    if (isNaN(dateParsed.getTime())) {
      throw new BadRequestException(`Invalid date format: ${date}`);
    }

    // Normalize to start of day (UTC)
    const dayStart = new Date(dateParsed);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Opening balance: SUM(totalPrice) for closed bookings where checkOut < dayStart
    const openingBalanceResult = await this.prisma.roomBooking.aggregate({
      _sum: { totalPrice: true },
      where: {
        isClosed: true,
        isCancelled: false,
        checkOut: { lt: dayStart },
      },
    });
    const openingBalance = Number(openingBalanceResult._sum.totalPrice ?? 0);

    // Daily entries: closed bookings where checkOut date equals the given date
    const bookings = await this.prisma.roomBooking.findMany({
      where: {
        isClosed: true,
        isCancelled: false,
        checkOut: { gte: dayStart, lt: dayEnd },
      },
      include: {
        member: { select: { Name: true } },
        rooms: {
          include: {
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    // Fetch voucher numbers for these bookings
    const bookingIds = bookings.map((b) => b.id);
    const vouchers =
      bookingIds.length > 0
        ? await this.prisma.paymentVoucher.findMany({
            where: {
              booking_type: 'ROOM' as any,
              booking_id: { in: bookingIds },
            },
            select: { booking_id: true, voucher_no: true, consumer_number: true },
          })
        : [];

    const voucherMap = new Map<number, string>();
    for (const v of vouchers) {
      if (v.booking_id != null) {
        voucherMap.set(v.booking_id, v.voucher_no ?? v.consumer_number ?? '');
      }
    }

    const entries = bookings.map((b) => {
      const extraCharges: { head: string; amount: number }[] =
        Array.isArray(b.extraCharges) ? (b.extraCharges as any[]) : [];

      const getCharge = (head: string) =>
        extraCharges
          .filter((c) => c.head === head)
          .reduce((sum, c) => sum + Number(c.amount), 0);

      const food = getCharge('Food');
      const gst = getCharge('GST');
      const serviceCharge = getCharge('SVC');
      const mattress = getCharge('Mattress');
      const laundry = getCharge('Laundry');
      const total = Number(b.totalPrice);
      const rent = total - food - gst - serviceCharge - mattress - laundry;

      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      const days = Math.max(
        1,
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
      );

      const roomNumber = b.rooms?.[0]?.room?.roomNumber ?? '';
      const guestName = b.member?.Name ?? b.guestName ?? '';

      return {
        roomNumber,
        guestName,
        from: checkIn.toISOString().split('T')[0],
        to: checkOut.toISOString().split('T')[0],
        days,
        rent,
        mattress,
        gst,
        food,
        serviceCharge,
        laundry,
        total,
        voucherNumber: voucherMap.get(b.id) ?? '',
      };
    });

    const entriesTotalSum = entries.reduce((sum, e) => sum + e.total, 0);
    const accumulativeTotal = openingBalance + entriesTotalSum;

    return { openingBalance, entries, accumulativeTotal };
  }

  async getSalesReport(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RoomSalesReportDto> {
    const { fromDate, toDate } = query;

    if (!fromDate) throw new BadRequestException('fromDate is required');
    if (!toDate) throw new BadRequestException('toDate is required');

    const fromDateParsed = new Date(fromDate);
    if (isNaN(fromDateParsed.getTime())) {
      throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
    }

    const toDateParsed = new Date(toDate);
    if (isNaN(toDateParsed.getTime())) {
      throw new BadRequestException(`Invalid toDate format: ${toDate}`);
    }
    toDateParsed.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.roomBooking.findMany({
      where: {
        isClosed: true,
        isCancelled: false,
        checkOut: { gte: fromDateParsed, lte: toDateParsed },
      },
      select: {
        checkOut: true,
        totalPrice: true,
        extraCharges: true,
      },
    });

    // Group by checkout date (YYYY-MM-DD)
    const dateMap = new Map<
      string,
      { food: number; gst: number; serviceCharge: number; numberOfBills: number; total: number }
    >();

    for (const booking of bookings) {
      const dateKey = new Date(booking.checkOut).toISOString().split('T')[0];

      const extraCharges: { head: string; amount: number }[] =
        Array.isArray(booking.extraCharges) ? (booking.extraCharges as any[]) : [];

      const getCharge = (head: string) =>
        extraCharges
          .filter((c) => c.head === head)
          .reduce((sum, c) => sum + Number(c.amount), 0);

      const food = getCharge('Food');
      const gst = getCharge('GST');
      const serviceCharge = getCharge('SVC');
      const total = Number(booking.totalPrice);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { food: 0, gst: 0, serviceCharge: 0, numberOfBills: 0, total: 0 });
      }

      const entry = dateMap.get(dateKey)!;
      entry.food += food;
      entry.gst += gst;
      entry.serviceCharge += serviceCharge;
      entry.numberOfBills += 1;
      entry.total += total;
    }

    // Sort entries by date ascending
    const entries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, agg]) => ({ date, ...agg }));

    // Compute totals row
    const totals = entries.reduce(
      (acc, e) => {
        acc.food += e.food;
        acc.gst += e.gst;
        acc.serviceCharge += e.serviceCharge;
        acc.numberOfBills += e.numberOfBills;
        acc.total += e.total;
        return acc;
      },
      { food: 0, gst: 0, serviceCharge: 0, numberOfBills: 0, total: 0 },
    );

    return { entries, totals };
  }

  async getCancellationReport(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RoomCancellationReportDto> {
    const { fromDate, toDate } = query;

    if (!fromDate) throw new BadRequestException('fromDate is required');
    if (!toDate) throw new BadRequestException('toDate is required');

    const fromDateParsed = new Date(fromDate);
    if (isNaN(fromDateParsed.getTime())) {
      throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
    }

    const toDateParsed = new Date(toDate);
    if (isNaN(toDateParsed.getTime())) {
      throw new BadRequestException(`Invalid toDate format: ${toDate}`);
    }
    toDateParsed.setHours(23, 59, 59, 999);

    // Total days in the month of fromDate
    const year = fromDateParsed.getFullYear();
    const month = fromDateParsed.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const bookings = await this.prisma.roomBooking.findMany({
      where: {
        isCancelled: true,
        checkIn: { gte: fromDateParsed, lte: toDateParsed },
      },
      include: {
        rooms: {
          include: {
            room: {
              include: {
                roomType: { select: { type: true } },
              },
            },
          },
        },
      },
    });

    const entries = bookings.map((b) => {
      const firstRoom = b.rooms?.[0];
      const roomNumber = firstRoom?.room?.roomNumber ?? '';
      const roomType = firstRoom?.room?.roomType?.type ?? '';

      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      const daysCanceled = Math.round(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      const cancellationPercentage =
        Math.round((daysCanceled / daysInMonth) * 100 * 100) / 100;

      return { roomType, roomNumber, daysInMonth, daysCanceled, cancellationPercentage };
    });

    return { entries };
  }

  async getMonthlyBills(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<RoomMonthlyBillsDto> {
    const { fromDate, toDate } = query;

    if (!fromDate) throw new BadRequestException('fromDate is required');
    if (!toDate) throw new BadRequestException('toDate is required');

    const fromDateParsed = new Date(fromDate);
    if (isNaN(fromDateParsed.getTime())) {
      throw new BadRequestException(`Invalid fromDate format: ${fromDate}`);
    }

    const toDateParsed = new Date(toDate);
    if (isNaN(toDateParsed.getTime())) {
      throw new BadRequestException(`Invalid toDate format: ${toDate}`);
    }
    toDateParsed.setHours(23, 59, 59, 999);

    // Helper to extract extra charge by head name
    const getCharge = (extraCharges: { head: string; amount: number }[], head: string) =>
      extraCharges
        .filter((c) => c.head === head)
        .reduce((sum, c) => sum + Number(c.amount), 0);

    // Query closed regular room bookings within the date range
    const roomBookings = await this.prisma.roomBooking.findMany({
      where: {
        isClosed: true,
        isCancelled: false,
        checkOut: { gte: fromDateParsed, lte: toDateParsed },
      },
      include: {
        member: { select: { Name: true, Membership_No: true } },
        rooms: {
          include: {
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { checkOut: 'asc' },
    });

    // Query closed affiliated club bookings within the date range
    const affBookings = await this.prisma.affClubBooking.findMany({
      where: {
        isClosed: true,
        isCancelled: false,
        checkOut: { gte: fromDateParsed, lte: toDateParsed },
      },
      include: {
        affiliatedClub: { select: { name: true } },
        rooms: {
          include: {
            room: { select: { roomNumber: true } },
          },
        },
      },
      orderBy: { checkOut: 'asc' },
    });

    // Summary counters
    const summary = { member: 0, guest: 0, forces: 0, affClub: 0 };

    const entries: RoomMonthlyBillsDto['entries'] = [];
    let sNo = 1;

    // Process regular room bookings
    for (const b of roomBookings) {
      const extraCharges: { head: string; amount: number }[] =
        Array.isArray(b.extraCharges) ? (b.extraCharges as any[]) : [];

      const food = getCharge(extraCharges, 'Food');
      const gst = getCharge(extraCharges, 'GST');
      const serviceCharge = getCharge(extraCharges, 'SVC');
      const mattress = getCharge(extraCharges, 'Mattress');
      const laundry = getCharge(extraCharges, 'Laundry');
      const total = Number(b.totalPrice);
      const rent = total - food - gst - serviceCharge - mattress - laundry;
      const advance = Number(b.paidAmount);
      const netTotal = total - advance;

      const roomNumber = b.rooms?.[0]?.room?.roomNumber ?? '';
      const memberNumber = b.Membership_No ?? '';
      const guestName = b.member?.Name ?? b.guestName ?? '';

      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);

      // Determine member type from paidBy
      const paidBy = b.paidBy as string;
      if (paidBy === 'FORCES') {
        summary.forces += 1;
      } else if (paidBy === 'GUEST') {
        summary.guest += 1;
      } else {
        summary.member += 1;
      }

      entries.push({
        sNo: sNo++,
        memberNumber,
        guestName,
        roomNumber,
        from: checkIn.toISOString().split('T')[0],
        to: checkOut.toISOString().split('T')[0],
        rent,
        gst,
        food,
        foodGst: 0,
        serviceCharge,
        mattress,
        mattressGst: 0,
        laundry,
        total,
        advance,
        netTotal,
      });
    }

    // Process affiliated club bookings
    for (const b of affBookings) {
      const extraCharges: { head: string; amount: number }[] =
        Array.isArray(b.extraCharges) ? (b.extraCharges as any[]) : [];

      const food = getCharge(extraCharges, 'Food');
      const gst = getCharge(extraCharges, 'GST');
      const serviceCharge = getCharge(extraCharges, 'SVC');
      const mattress = getCharge(extraCharges, 'Mattress');
      const laundry = getCharge(extraCharges, 'Laundry');
      const total = Number(b.totalPrice);
      const rent = total - food - gst - serviceCharge - mattress - laundry;
      const advance = Number(b.paidAmount);
      const netTotal = total - advance;

      const roomNumber = b.rooms?.[0]?.room?.roomNumber ?? '';
      const guestName = b.guestName ?? b.affiliatedClub?.name ?? '';

      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);

      summary.affClub += 1;

      entries.push({
        sNo: sNo++,
        memberNumber: b.affiliatedMembershipNo ?? '',
        guestName,
        roomNumber,
        from: checkIn.toISOString().split('T')[0],
        to: checkOut.toISOString().split('T')[0],
        rent,
        gst,
        food,
        foodGst: 0,
        serviceCharge,
        mattress,
        mattressGst: 0,
        laundry,
        total,
        advance,
        netTotal,
      });
    }

    return { summary, entries };
  }

  private mapToDto(booking: any): RoomBookingReportDto {
    const extraCharges: { head: string; amount: number }[] =
      Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    const getCharge = (head: string) =>
      extraCharges
        .filter((c) => c.head === head)
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const food = getCharge('Food');
    const gst = getCharge('GST');
    const serviceCharge = getCharge('SVC');
    const mattress = getCharge('Mattress');
    const laundry = getCharge('Laundry');

    // Derive room info from first room in the booking
    const firstRoomOnBooking = booking.rooms?.[0];
    const roomNumber = firstRoomOnBooking?.room?.roomNumber ?? '';
    const roomType = firstRoomOnBooking?.room?.roomType?.type ?? '';

    // Calculate days
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const days = Math.max(
      1,
      Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Determine booking status string
    let bookingStatus = 'BOOKED';
    if (booking.isCancelled) bookingStatus = 'CANCELED';
    else if (booking.isClosed) bookingStatus = 'OCCUPIED';

    const dto = new RoomBookingReportDto();
    dto.id = booking.id;
    dto.memberName = booking.member?.Name ?? booking.guestName ?? '';
    dto.memberNumber = booking.Membership_No;
    dto.roomNumber = roomNumber;
    dto.roomType = roomType;
    dto.checkIn = checkIn.toISOString().split('T')[0];
    dto.checkOut = checkOut.toISOString().split('T')[0];
    dto.days = days;
    dto.rent = Number(booking.totalPrice) - food - gst - serviceCharge - mattress - laundry;
    dto.gst = gst;
    dto.food = food;
    dto.serviceCharge = serviceCharge;
    dto.mattress = mattress;
    dto.laundry = laundry;
    dto.total = Number(booking.totalPrice);
    dto.paymentStatus = booking.paymentStatus;
    dto.bookingStatus = bookingStatus;
    dto.bookedBy = booking.createdBy ?? '';

    return dto;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberStatus, PaymentStatus, VoucherStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getStats(from?: string, to?: string) {
    const now = new Date();
    const startDate = from ? new Date(from) : new Date();
    const endDate = to ? new Date(to) : new Date();

    if (!from || !to) {
      startDate.setMonth(now.getMonth() - 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Member Stats (Currently absolute, but we'll show total and current status counts)
    const totalMembers = await this.prisma.member.count();
    const statusCounts = await this.prisma.member.groupBy({
      by: ['Status'],
      _count: {
        _all: true,
      },
    });

    const memberStats: Record<string, number> = {};
    for (const s of Object.values(MemberStatus)) {
      memberStats[s] = 0;
    }

    statusCounts.forEach((sc) => {
      memberStats[sc.Status] = sc._count._all;
    });

    // Remap for frontend compatibility if needed, or better, pass the raw map
    // We will pass the raw map to frontend to be flexible

    // 2. Bookings in Range
    const [roomBookings, hallBookings, lawnBookings, photoshootBookings] = await Promise.all([
      this.prisma.roomBooking.count({ where: { checkIn: { gte: startDate, lte: endDate } } }),
      this.prisma.hallBooking.count({ where: { bookingDate: { gte: startDate, lte: endDate } } }),
      this.prisma.lawnBooking.count({ where: { bookingDate: { gte: startDate, lte: endDate } } }),
      this.prisma.photoshootBooking.count({ where: { bookingDate: { gte: startDate, lte: endDate } } }),
    ]);

    // 3. Payment Status (Aggregate from bookings in range)
    const paymentStats = { UNPAID: 0, HALF_PAID: 0, PAID: 0 };
    const bookingTables = ['roomBooking', 'hallBooking', 'lawnBooking', 'photoshootBooking'];

    for (const table of bookingTables) {
      const dateField = table === 'roomBooking' ? 'checkIn' : 'bookingDate';
      const stats = await (this.prisma[table] as any).groupBy({
        by: ['paymentStatus'],
        where: { [dateField]: { gte: startDate, lte: endDate } },
        _count: { _all: true }
      });

      stats.forEach((s: any) => {
        if (s.paymentStatus === PaymentStatus.UNPAID) paymentStats.UNPAID += s._count._all;
        if (s.paymentStatus === PaymentStatus.HALF_PAID) paymentStats.HALF_PAID += s._count._all;
        if (s.paymentStatus === PaymentStatus.PAID) paymentStats.PAID += s._count._all;
      });
    }

    // 4. Detailed Facility Stats (Occupancy/Usage %)
    const rangeInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInRange = Math.max(1, rangeInDays);
    const roomCount = await this.prisma.room.count({ where: { isActive: true } });
    const hallCount = await this.prisma.hall.count({ where: { isActive: true } });
    const lawnCount = await this.prisma.lawn.count({ where: { isActive: true } });

    // Approximate occupancy (Total days booked / (Total capacity * Days in range))
    const occupancy = {
      room: roomCount > 0 ? (roomBookings / (roomCount * totalDaysInRange)) * 100 : 0,
      hall: hallCount > 0 ? (hallBookings / (hallCount * totalDaysInRange)) * 100 : 0,
      lawn: lawnCount > 0 ? (lawnBookings / (lawnCount * totalDaysInRange)) * 100 : 0,
      photoshoot: 0, // Hourly, logic is different
    };

    // 5. Sports Stats
    const totalSportsSubs = await this.prisma.sportSubscription.count({ where: { isActive: true } });
    const sportBreakdown = await this.prisma.sportSubscription.groupBy({
      by: ['sportId'],
      _count: { _all: true },
      where: { isActive: true }
    });

    // Convert sport IDs to names
    const sports = await this.prisma.sport.findMany({
      where: { id: { in: sportBreakdown.map(s => s.sportId) } },
      select: { id: true, activity: true }
    });
    const sportStats = sportBreakdown.map(s => ({
      name: sports.find(sp => sp.id === s.sportId)?.activity || 'Unknown',
      count: s._count._all
    }));

    // 6. Affiliated Clubs & Requests
    const totalClubs = await this.prisma.affiliatedClub.count({ where: { isActive: true } });
    const pendingClubRequests = await this.prisma.affiliatedClubRequest.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    });

    // 7. Content & Announcements
    const [eventsCount, announcementsCount, adsCount] = await Promise.all([
      this.prisma.event.count({ where: { startDate: { lte: endDate }, endDate: { gte: startDate } } }),
      this.prisma.announcement.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      this.prisma.promotionalAd.count({ where: { isActive: true } }),
    ]);

    // 8. Financial Details (Voucher Types)
    const voucherStats = await this.prisma.paymentVoucher.groupBy({
      by: ['voucher_type'],
      where: { status: VoucherStatus.CONFIRMED, issued_at: { gte: startDate, lte: endDate } },
      _count: { _all: true }
    });

    // 9. Trend Data
    const rangeInDaysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isDaily = rangeInDaysCount <= 32;

    // Revenue from Vouchers in range
    const vouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        status: VoucherStatus.CONFIRMED,
        issued_at: { gte: startDate, lte: endDate },
      },
      select: { amount: true, issued_at: true },
    });

    // Bookings dates for trend
    const [rooms, halls, lawns, photoshoots] = await Promise.all([
      this.prisma.roomBooking.findMany({ where: { checkIn: { gte: startDate, lte: endDate } }, select: { checkIn: true } }),
      this.prisma.hallBooking.findMany({ where: { bookingDate: { gte: startDate, lte: endDate } }, select: { bookingDate: true } }),
      this.prisma.lawnBooking.findMany({ where: { bookingDate: { gte: startDate, lte: endDate } }, select: { bookingDate: true } }),
      this.prisma.photoshootBooking.findMany({ where: { bookingDate: { gte: startDate, lte: endDate } }, select: { bookingDate: true } }),
    ]);

    const trendData = new Map<string, { bookings: number; revenue: number }>();

    if (isDaily) {
      // Daily granularity
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toLocaleDateString('default', { day: 'numeric', month: 'short' });
        trendData.set(key, { bookings: 0, revenue: 0 });
      }
    } else {
      // Monthly granularity (for ranges > 32 days)
      const current = new Date(startDate);
      while (current <= endDate) {
        const key = current.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!trendData.has(key)) trendData.set(key, { bookings: 0, revenue: 0 });
        current.setMonth(current.getMonth() + 1);
      }
    }

    const addToTrend = (date: Date, type: 'bookings' | 'revenue', value: number) => {
      const key = isDaily
        ? date.toLocaleDateString('default', { day: 'numeric', month: 'short' })
        : date.toLocaleString('default', { month: 'short', year: '2-digit' });

      if (trendData.has(key)) {
        const entry = trendData.get(key)!;
        entry[type] += value;
      }
    };

    vouchers.forEach(v => addToTrend(v.issued_at, 'revenue', Number(v.amount)));
    rooms.forEach(b => addToTrend(b.checkIn, 'bookings', 1));
    halls.forEach(b => addToTrend(b.bookingDate, 'bookings', 1));
    lawns.forEach(b => addToTrend(b.bookingDate, 'bookings', 1));
    photoshoots.forEach(b => addToTrend(b.bookingDate, 'bookings', 1));

    const monthlyTrend = Array.from(trendData.entries())
      .map(([month, data]) => ({ month, ...data }));

    return {
      totalMembers,
      memberStats,
      upcomingBookings: {
        room: roomBookings,
        hall: hallBookings,
        lawn: lawnBookings,
        photoshoot: photoshootBookings,
      },
      occupancy,
      sports: {
        total: totalSportsSubs,
        breakdown: sportStats,
      },
      clubs: {
        total: totalClubs,
        pendingRequests: pendingClubRequests,
      },
      content: {
        events: eventsCount,
        announcements: announcementsCount,
        ads: adsCount,
      },
      vouchers: voucherStats.map(v => ({ type: v.voucher_type, count: v._count._all })),
      paymentsUnpaid: paymentStats.UNPAID,
      paymentsHalfPaid: paymentStats.HALF_PAID,
      paymentsPaid: paymentStats.PAID,
      monthlyTrend,
    };
  }
}

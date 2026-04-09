import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

describe('BookingService - Filter Where Clause Construction', () => {
  let service: BookingService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrisma = {
      roomBooking: { findMany: jest.fn().mockResolvedValue([]) },
      hallBooking: { findMany: jest.fn().mockResolvedValue([]) },
      lawnBooking: { findMany: jest.fn().mockResolvedValue([]) },
      photoshootBooking: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: { notifyMember: jest.fn() } },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prismaService = module.get(PrismaService);
  });

  // ─── 11.1 membershipNo produces case-insensitive contains clause ───────────

  describe('11.1 membershipNo filter', () => {
    it('Room: sets Membership_No contains on where', async () => {
      await service.gBookingsRoom(1, 10, { membershipNo: 'ABC' });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.Membership_No).toEqual({ contains: 'ABC' });
    });

    it('Hall: sets Membership_No contains on where', async () => {
      await service.gBookingsHall(1, 10, { membershipNo: 'ABC' });
      const args = prismaService.hallBooking.findMany.mock.calls[0][0];
      expect(args.where.Membership_No).toEqual({ contains: 'ABC' });
    });

    it('Lawn: sets member.Membership_No contains on where', async () => {
      await service.gBookingsLawn(1, 10, { membershipNo: 'ABC' });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      expect(args.where.member).toEqual({
        Membership_No: { contains: 'ABC' },
      });
    });

    it('Photoshoot: sets member.Membership_No contains on where', async () => {
      await service.gBookingPhotoshoot(1, 10, { membershipNo: 'ABC' });
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      expect(args.where.member).toEqual({
        Membership_No: { contains: 'ABC' },
      });
    });

    it('Room: absent membershipNo does not add Membership_No to where', async () => {
      await service.gBookingsRoom(1, 10, {});
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.Membership_No).toBeUndefined();
    });
  });

  // ─── 11.2 bookingId produces exact id match ────────────────────────────────

  describe('11.2 bookingId filter', () => {
    it('Room: sets where.id to the numeric bookingId', async () => {
      await service.gBookingsRoom(1, 10, { bookingId: 42 });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.id).toBe(42);
    });

    it('Hall: sets where.id to the numeric bookingId', async () => {
      await service.gBookingsHall(1, 10, { bookingId: 7 });
      const args = prismaService.hallBooking.findMany.mock.calls[0][0];
      expect(args.where.id).toBe(7);
    });

    it('Lawn: sets where.id to the numeric bookingId', async () => {
      await service.gBookingsLawn(1, 10, { bookingId: 99 });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      expect(args.where.id).toBe(99);
    });

    it('Photoshoot: sets where.id to the numeric bookingId', async () => {
      await service.gBookingPhotoshoot(1, 10, { bookingId: 5 });
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      expect(args.where.id).toBe(5);
    });

    it('Room: absent bookingId does not add id to where', async () => {
      await service.gBookingsRoom(1, 10, {});
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.id).toBeUndefined();
    });
  });

  // ─── 11.3 checkIn/checkOut produce day-boundary gte/lte clauses ───────────

  describe('11.3 checkIn/checkOut day-boundary clauses', () => {
    const dateStr = '2024-06-15';

    it('Room checkIn: gte is start of day, lte is end of day', async () => {
      await service.gBookingsRoom(1, 10, { checkIn: dateStr });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.checkIn;
      expect(gte.getHours()).toBe(0);
      expect(gte.getMinutes()).toBe(0);
      expect(gte.getSeconds()).toBe(0);
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);
      expect(lte.getSeconds()).toBe(59);
    });

    it('Room checkOut: gte is start of day, lte is end of day', async () => {
      await service.gBookingsRoom(1, 10, { checkOut: dateStr });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.checkOut;
      expect(gte.getHours()).toBe(0);
      expect(lte.getHours()).toBe(23);
    });

    it('Hall checkIn: gte/lte day boundaries set on where.checkIn', async () => {
      await service.gBookingsHall(1, 10, { checkIn: dateStr });
      const args = prismaService.hallBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.checkIn;
      expect(gte.getHours()).toBe(0);
      expect(lte.getHours()).toBe(23);
    });

    it('Room: absent checkIn does not add checkIn to where', async () => {
      await service.gBookingsRoom(1, 10, {});
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.checkIn).toBeUndefined();
      expect(args.where.checkOut).toBeUndefined();
    });

    it('Room checkIn gte and lte are on the same calendar date', async () => {
      await service.gBookingsRoom(1, 10, { checkIn: dateStr });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.checkIn;
      expect(gte.toDateString()).toBe(lte.toDateString());
    });
  });

  // ─── 11.4 paymentStatus "ALL" is omitted from where clause ────────────────

  describe('11.4 paymentStatus "ALL" omitted', () => {
    it('Room: paymentStatus "ALL" is not added to where', async () => {
      await service.gBookingsRoom(1, 10, { paymentStatus: 'ALL' });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBeUndefined();
    });

    it('Hall: paymentStatus "ALL" is not added to where', async () => {
      await service.gBookingsHall(1, 10, { paymentStatus: 'ALL' });
      const args = prismaService.hallBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBeUndefined();
    });

    it('Lawn: paymentStatus "ALL" is not added to where', async () => {
      await service.gBookingsLawn(1, 10, { paymentStatus: 'ALL' });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBeUndefined();
    });

    it('Photoshoot: paymentStatus "ALL" is not added to where', async () => {
      await service.gBookingPhotoshoot(1, 10, { paymentStatus: 'ALL' });
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBeUndefined();
    });

    it('Room: absent paymentStatus is not added to where', async () => {
      await service.gBookingsRoom(1, 10, {});
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBeUndefined();
    });

    it('Room: specific paymentStatus "PAID" IS added to where', async () => {
      await service.gBookingsRoom(1, 10, { paymentStatus: 'PAID' });
      const args = prismaService.roomBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBe('PAID');
    });

    it('Hall: specific paymentStatus "UNPAID" IS added to where', async () => {
      await service.gBookingsHall(1, 10, { paymentStatus: 'UNPAID' });
      const args = prismaService.hallBooking.findMany.mock.calls[0][0];
      expect(args.where.paymentStatus).toBe('UNPAID');
    });
  });

  // ─── 11.5 Lawn checkIn maps to bookingDate, checkOut maps to endDate ───────

  describe('11.5 Lawn field mapping', () => {
    const dateStr = '2024-07-20';

    it('Lawn checkIn maps to where.bookingDate (not where.checkIn)', async () => {
      await service.gBookingsLawn(1, 10, { checkIn: dateStr });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      expect(args.where.bookingDate).toBeDefined();
      expect(args.where.checkIn).toBeUndefined();
    });

    it('Lawn checkIn bookingDate has gte/lte day boundaries', async () => {
      await service.gBookingsLawn(1, 10, { checkIn: dateStr });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.bookingDate;
      expect(gte.getHours()).toBe(0);
      expect(lte.getHours()).toBe(23);
    });

    it('Lawn checkOut maps to where.endDate (not where.checkOut)', async () => {
      await service.gBookingsLawn(1, 10, { checkOut: dateStr });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      expect(args.where.endDate).toBeDefined();
      expect(args.where.checkOut).toBeUndefined();
    });

    it('Lawn checkOut endDate has gte/lte day boundaries', async () => {
      await service.gBookingsLawn(1, 10, { checkOut: dateStr });
      const args = prismaService.lawnBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.endDate;
      expect(gte.getHours()).toBe(0);
      expect(lte.getHours()).toBe(23);
    });
  });

  // ─── 11.6 Photoshoot checkIn maps to bookingDate ──────────────────────────

  describe('11.6 Photoshoot field mapping', () => {
    const dateStr = '2024-08-10';

    it('Photoshoot checkIn maps to where.bookingDate (not where.checkIn)', async () => {
      await service.gBookingPhotoshoot(1, 10, { checkIn: dateStr });
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      expect(args.where.bookingDate).toBeDefined();
      expect(args.where.checkIn).toBeUndefined();
    });

    it('Photoshoot checkIn bookingDate has gte/lte day boundaries', async () => {
      await service.gBookingPhotoshoot(1, 10, { checkIn: dateStr });
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      const { gte, lte } = args.where.bookingDate;
      expect(gte.getHours()).toBe(0);
      expect(lte.getHours()).toBe(23);
    });

    it('Photoshoot: absent checkIn does not add bookingDate to where', async () => {
      await service.gBookingPhotoshoot(1, 10, {});
      const args = prismaService.photoshootBooking.findMany.mock.calls[0][0];
      expect(args.where.bookingDate).toBeUndefined();
    });
  });
});

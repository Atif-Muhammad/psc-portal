import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BookingType, PaidBy, PaymentMode, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  formatPakistanDate,
  getPakistanDate,
  parsePakistanDate,
} from 'src/utils/time';
import { BookingService } from 'src/booking/booking.service';

@Injectable()
export class PaymentService {
  constructor(
    private prismaService: PrismaService,
    private bookingService: BookingService,
  ) { }

  // kuick pay
  // Mock payment gateway call - replace with actual integration
  private async callPaymentGateway(paymentData: any) {
    // Simulate API call to payment gateway
    // console.log('Calling payment gateway with:', paymentData);

    // This would be your actual payment gateway integration
    // For example:
    // const response = await axios.post('https://payment-gateway.com/invoice', paymentData);
    // return response.data;

    // the kuickpay api will call member booking api once payment is done
    paymentData.type === 'room' &&
      (await fetch('http://localhost:3000/booking/member/booking/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData.bookingData,
          membershipNo: paymentData.consumerInfo.membership_no,
          paymentMode: 'ONLINE',
          paymentStatus: 'PAID', // Online payment is successful at this point
        }),
      }));
    const bookHall = async (paymentData) => {
      const done = await fetch(
        'http://localhost:3000/booking/member/booking/hall',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...paymentData.bookingData,
            membershipNo: paymentData.consumerInfo.membership_no,
            paymentMode: 'ONLINE',
            paymentStatus: 'PAID',
          }),
        },
      );
      console.log(done);
    };
    paymentData.type === 'hall' && bookHall(paymentData);
    paymentData.type === 'lawn' &&
      (await fetch('http://localhost:3000/booking/member/booking/lawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData.bookingData,
          membershipNo: paymentData.consumerInfo.membership_no,
          paymentMode: 'ONLINE',
          paymentStatus: 'PAID',
        }),
      }));

    const bookPhoto = async (paymentData) => {
      const done = await fetch(
        'http://localhost:3000/booking/member/booking/photoshoot',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...paymentData.bookingData,
            membershipNo: paymentData.consumerInfo.membership_no,
            paymentMode: 'ONLINE',
            paymentStatus: 'PAID',
          }),
        },
      );
      // console.log(done)
    };
    paymentData.type === 'photoshoot' && bookPhoto(paymentData);

    // Mock successful response
    return {
      success: true,
      transactionId:
        'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    };
  }


  async confirmBooking(type: string, id: number) {
    console.log(`Confirming ${type} booking with ID: ${id}`);
    const bookingType = type.toUpperCase() as BookingType;

    return await this.prismaService.$transaction(async (prisma) => {
      let booking: any;
      let membershipNo: string = '';
      let totalAmount: number = 0;

      // 1. Fetch booking and confirm it
      if (bookingType === 'ROOM') {
        booking = await prisma.roomBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { rooms: true }
        });
        membershipNo = booking.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'HALL') {
        booking = await prisma.hallBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true }
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'LAWN') {
        booking = await prisma.lawnBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true }
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'PHOTOSHOOT') {
        booking = await prisma.photoshootBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true }
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      }
      // Add more types as needed...

      // 2. Update Voucher
      await prisma.paymentVoucher.updateMany({
        where: { booking_id: id, booking_type: bookingType, status: VoucherStatus.PENDING },
        data: { status: VoucherStatus.CONFIRMED }
      });

      // 3. Clear Holdings
      if (bookingType === 'ROOM') {
        const roomIds = booking.rooms.map(r => r.roomId);
        await prisma.roomHoldings.deleteMany({
          where: { roomId: { in: roomIds }, holdBy: membershipNo }
        });
      } else if (bookingType === 'HALL') {
        await prisma.hallHoldings.deleteMany({
          where: { hallId: booking.hallId, holdBy: membershipNo }
        });
      } else if (bookingType === 'LAWN') {
        await prisma.lawnHoldings.deleteMany({
          where: { lawnId: booking.lawnId, holdBy: membershipNo }
        });
      }

      // 4. Update Member Ledger (Mimicking ledger updates in BookingService)
      // Note: This logic should ideally be shared or called from BookingService
      const member = await prisma.member.findUnique({
        where: { Membership_No: membershipNo }
      });

      if (member) {
        await prisma.member.update({
          where: { Membership_No: membershipNo },
          data: {
            totalBookings: { increment: 1 },
            lastBookingDate: getPakistanDate(),
            bookingAmountPaid: { increment: Math.round(totalAmount) },
            bookingBalance: { increment: Math.round(totalAmount) },
            // Since it's PAID, we don't increment bookingAmountDue
          },
        });
      }

      if (!membershipNo || totalAmount === 0) {
        throw new BadRequestException(`Unsupported or invalid booking type: ${type}`);
      }

      return { success: true, booking };
    });
  }

  private async createVoucher(data: {
    booking_type: BookingType;
    booking_id: number;
    membership_no: string;
    amount: number;
    payment_mode: PaymentMode;
    voucher_type: VoucherType;
    status?: VoucherStatus;
    issued_by?: string;
    remarks: string;
    expiresAt?: Date;
  }) {
    return await this.prismaService.paymentVoucher.create({
      data: {
        booking_type: data.booking_type,
        booking_id: data.booking_id,
        membership_no: data.membership_no,
        amount: data.amount,
        payment_mode: data.payment_mode,
        voucher_type: data.voucher_type,
        status: data.status || VoucherStatus.PENDING,
        issued_by: data.issued_by || 'system',
        remarks: data.remarks,
        expiresAt: data.expiresAt,
      },
    });
  }

  ///////////////////////////////////////////////////////////////////////

  async genInvoiceRoom(roomType: number, bookingData: any) {

    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no }
    })
    if (member?.Status !== 'ACTIVE') throw new UnprocessableEntityException(`Cannot book for inactive member`);
    // Validate room type exists
    const typeExists = await this.prismaService.roomType.findFirst({
      where: { id: roomType },
    });
    if (!typeExists) throw new NotFoundException(`Room type not found`);
    // console.log(bookingData)
    // Parse dates
    const checkIn = parsePakistanDate(bookingData.from);
    const checkOut = parsePakistanDate(bookingData.to);

    // Validate dates
    if (checkIn >= checkOut) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const today = getPakistanDate();
    today.setHours(0, 0, 0, 0);

    const checkInDateOnly = new Date(checkIn);
    checkInDateOnly.setHours(0, 0, 0, 0);

    if (checkInDateOnly < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Calculate number of nights and price
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const pricePerNight =
      bookingData.pricingType === 'member'
        ? typeExists.priceMember
        : typeExists.priceGuest;
    const totalPrice =
      Number(pricePerNight) * nights * bookingData.numberOfRooms;

    // Get available rooms with a single complex query
    const availableRooms = await this.prismaService.room.findMany({
      where: {
        roomTypeId: roomType,
        isActive: true,
        holdings: {
          none: {
            holdBy: { not: bookingData.membership_no.toString() },
            onHold: true,
            holdExpiry: { gt: new Date() },
          },
        },
        // No reservations during requested period
        reservations: {
          none: {
            reservedFrom: { lt: checkOut },
            reservedTo: { gt: checkIn },
          },
        },
        // No bookings during requested period
        bookings: {
          none: {
            booking: {
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            }
          },
        },
        // No out-of-order periods during requested period
        outOfOrders: {
          none: {
            AND: [
              { startDate: { lte: checkOut } },
              { endDate: { gte: checkIn } },
            ],
          },
        },
      },
      orderBy: {
        roomNumber: 'asc',
      },
    });

    // Check if enough rooms are available
    if (availableRooms.length < bookingData.numberOfRooms) {
      // Get total count of rooms of this type for better error message
      const totalRoomsOfType = await this.prismaService.room.count({
        where: { roomTypeId: roomType, isActive: true },
      });

      const unavailableCount = totalRoomsOfType - availableRooms.length;

      throw new ConflictException(
        `Only ${availableRooms.length} room(s) available. Requested: ${bookingData.numberOfRooms}. ` +
        `${unavailableCount} room(s) are either reserved, booked, on maintenance, or on active hold.`,
      );
    }

    // Select specific rooms for booking
    const selectedRooms = availableRooms.slice(0, bookingData.numberOfRooms);

    // Calculate expiry time (1 hour from now for refined flow)
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const invoiceDueDate = new Date(Date.now() + 60 * 60 * 1000);

    // Put rooms on hold
    try {
      const membershipNoString = String(bookingData.membership_no);

      const holdPromises = selectedRooms.map((room) =>
        this.prismaService.roomHoldings.create({
          data: {
            roomId: room.id,
            onHold: true,
            holdExpiry: holdExpiry,
            holdBy: membershipNoString,
          },
        }),
      );

      await Promise.all(holdPromises);
    } catch (holdError) {
      console.error('Failed to put rooms on hold:', holdError);
      throw new InternalServerErrorException(
        'Failed to reserve rooms temporarily',
      );
    }

    // Prepare booking data
    // create temporary(unconfirmed) booking
    const booking = await this.prismaService.roomBooking.create({
      data: {
        Membership_No: String(bookingData.membership_no),
        checkIn,
        checkOut,
        totalPrice,
        pricingType: bookingData.pricingType,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        pendingAmount: totalPrice,
        numberOfAdults: bookingData.numberOfAdults,
        numberOfChildren: bookingData.numberOfChildren,
        specialRequests: bookingData.specialRequest || '',
        paidBy: 'MEMBER',
        guestName: bookingData.guestName,
        guestContact: bookingData.guestContact?.toString(),
        isConfirmed: false,
        rooms: {
          create: selectedRooms.map((r: any) => ({
            roomId: r.id,
            priceAtBooking: bookingData.pricingType === 'member' ? r.roomType.priceMember : r.roomType.priceGuest
          }))
        }
      }
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'ROOM',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: "FULL_PAYMENT",
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Room booking voucher for ${selectedRooms.map((room) => room.roomNumber).join(', ')}`,
      expiresAt: holdExpiry
    });

    // dummy api call to confirm (mimicking webhook/payment callback)
    // we'll simulate this by calling a method in booking.service (to be implemented)
    // For now, let's keep the return as voucher and the user can decide how they'll call confirmation.
    // However, the user asked for the dummy call to be part of the flow.
    if (voucher) {
      // Mimicking dummy call to confirm internal logic
      // In a real scenario, this would be triggered by a payment successful webhook
      // async confirm call
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:3000/api/payment/confirm/ROOM/${booking.id}`, {
            method: 'POST'
          });
        } catch (e) {
          console.error("Dummy confirmation call failed", e);
        }
      }, 5000); // 5 seconds later

      return voucher;
    }
    throw new HttpException('Failed to create voucher', 500);
  }

  async genInvoiceHall(hallId: number, bookingData: any) {
    console.log('Hall booking data received:', bookingData);
    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no }
    })
    if (member?.Status !== 'ACTIVE') throw new UnprocessableEntityException(`Cannot book for inactive member`);

    // ── 1. VALIDATE HALL EXISTS ─────────────────────────────
    const hallExists = await this.prismaService.hall.findFirst({
      where: { id: hallId },
      include: {
        outOfOrders: true, // Include out-of-order periods
        holdings: {
          where: {
            holdBy: bookingData.membership_no,
            onHold: true,
            holdExpiry: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!hallExists) {
      throw new NotFoundException(`Hall not found`);
    }

    // ── 2. VALIDATE REQUIRED FIELDS ─────────────────────────
    if (!bookingData.bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!bookingData.eventTime) {
      throw new BadRequestException('Event time slot is required');
    }
    if (!bookingData.eventType) {
      throw new BadRequestException('Event type is required');
    }

    // ── 3. PARSE AND VALIDATE BOOKING DATE ──────────────────
    const bookingDate = new Date(bookingData.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    // ── 4. VALIDATE EVENT TIME SLOT ─────────────────────────
    const normalizedEventTime = bookingData.eventTime.toUpperCase() as
      | 'MORNING'
      | 'EVENING'
      | 'NIGHT';
    const validEventTimes = ['MORNING', 'EVENING', 'NIGHT'];

    if (!validEventTimes.includes(normalizedEventTime)) {
      throw new BadRequestException(
        'Invalid event time. Must be MORNING, EVENING, or NIGHT',
      );
    }

    // ── 5. CHECK IF HALL IS ON HOLD ─────────────────────────
    if (hallExists.holdings && hallExists.holdings.length > 0) {
      const activeHold = hallExists.holdings[0];
      // Check if the hold is by a different user
      if (activeHold.holdBy !== bookingData.membership_no?.toString()) {
        throw new ConflictException(
          `Hall '${hallExists.name}' is currently on hold by another user`,
        );
      }
    }

    // ── 6. CHECK OUT-OF-ORDER PERIODS ──────────────────────
    // Check for conflicts with out-of-order periods
    const conflictingOutOfOrder = hallExists.outOfOrders?.find((period) => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(0, 0, 0, 0);

      return bookingDate >= periodStart && bookingDate <= periodEnd;
    });

    if (conflictingOutOfOrder) {
      const startDate = new Date(conflictingOutOfOrder.startDate);
      const endDate = new Date(conflictingOutOfOrder.endDate);

      throw new ConflictException(
        `Hall '${hallExists.name}' is out of order from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}: ${conflictingOutOfOrder.reason}`,
      );
    }

    // Check if hall is currently out of order (active period)
    const now = new Date();
    const isCurrentlyOutOfOrder = hallExists.outOfOrders?.some((period) => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      return now >= periodStart && now <= periodEnd;
    });

    // If hall is currently out of order and not active
    if (isCurrentlyOutOfOrder && !hallExists.isActive) {
      throw new ConflictException(
        `Hall '${hallExists.name}' is currently out of order`,
      );
    }

    // ── 7. CHECK FOR EXISTING BOOKINGS ──────────────────────
    const existingBooking = await this.prismaService.hallBooking.findFirst({
      where: {
        hallId: hallExists.id,
        bookingDate: bookingDate,
        bookingTime: normalizedEventTime,
      },
    });

    if (existingBooking) {
      const timeSlotMap = {
        MORNING: 'Morning (8:00 AM - 2:00 PM)',
        EVENING: 'Evening (2:00 PM - 8:00 PM)',
        NIGHT: 'Night (8:00 PM - 12:00 AM)',
      };

      throw new ConflictException(
        `Hall '${hallExists.name}' is already booked for ${bookingDate.toLocaleDateString()} during ${timeSlotMap[normalizedEventTime]}`,
      );
    }

    // ── 8. CHECK FOR RESERVATIONS ───────────────────────────
    const conflictingReservation =
      await this.prismaService.hallReservation.findFirst({
        where: {
          hallId: hallExists.id,
          AND: [
            { reservedFrom: { lte: bookingDate } },
            { reservedTo: { gt: bookingDate } },
          ],
          timeSlot: normalizedEventTime,
        },
      });

    if (conflictingReservation) {
      throw new ConflictException(
        `Hall '${hallExists.name}' is reserved from ${conflictingReservation.reservedFrom.toLocaleDateString()} to ${conflictingReservation.reservedTo.toLocaleDateString()} (${normalizedEventTime} time slot)`,
      );
    }

    // ── 9. CALCULATE TOTAL PRICE ────────────────────────────
    const basePrice =
      bookingData.pricingType === 'member'
        ? hallExists.chargesMembers
        : hallExists.chargesGuests;
    const totalPrice = Number(basePrice);

    // ── 10. CALCULATE HOLD EXPIRY ───────────────────────────
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for refined flow
    const invoiceDueDate = new Date(Date.now() + 60 * 60 * 1000);

    // ── 11. PUT HALL ON HOLD ────────────────────────────────
    try {
      await this.prismaService.hallHoldings.create({
        data: {
          hallId: hallExists.id,
          onHold: true,
          holdExpiry: holdExpiry,
          holdBy: String(bookingData.membership_no),
        },
      });

      console.log(`Put hall '${hallExists.name}' on hold until ${holdExpiry}`);
    } catch (holdError) {
      console.error('Failed to put hall on hold:', holdError);
      throw new InternalServerErrorException(
        'Failed to reserve hall temporarily',
      );
    }

    // ── 12. PREPARE BOOKING DATA ────────────────────────────
    // (using holdExpiry from above)

    // create temporary(unconfirmed) booking
    const booking = await this.prismaService.hallBooking.create({
      data: {
        memberId: member.Sno, // Use member.Sno from line 321
        hallId: hallExists.id,
        bookingDate: bookingDate,
        bookingTime: normalizedEventTime,
        eventType: bookingData.eventType,
        numberOfGuests: bookingData.numberOfGuests || 0,
        pricingType: bookingData.pricingType,
        totalPrice: totalPrice,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        pendingAmount: totalPrice,
        guestName: bookingData.guestName,
        guestContact: bookingData.guestContact?.toString(),
        isConfirmed: false,
        paidBy: 'MEMBER',
      }
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'HALL',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: "FULL_PAYMENT",
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Hall booking voucher for ${hallExists.name}`,
      expiresAt: holdExpiry
    });

    // dummy api call to confirm
    if (voucher) {
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:3000/api/payment/confirm/HALL/${booking.id}`, {
            method: 'POST'
          });
        } catch (e) {
          console.error("Dummy confirmation call failed for HALL", e);
        }
      }, 5000);

      return voucher;
    }
    throw new HttpException('Failed to create voucher', 500);

  }

  async genInvoiceLawn(lawnId: number, bookingData: any) {
    console.log('Lawn booking data received:', bookingData);

    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no }
    })
    if (member?.Status !== 'ACTIVE') throw new UnprocessableEntityException(`Cannot book for inactive member`);

    // ── 1. VALIDATE LAWN EXISTS ─────────────────────────────
    const lawnExists = await this.prismaService.lawn.findFirst({
      where: { id: lawnId },
      include: {
        lawnCategory: true,
        outOfOrders: {
          orderBy: { startDate: 'asc' },
        },
        holdings: {
          where: {
            holdBy: bookingData.membership_no,
            onHold: true,
            holdExpiry: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lawnExists) {
      throw new NotFoundException(`Lawn not found`);
    }

    // ── 2. VALIDATE REQUIRED FIELDS ─────────────────────────
    if (!bookingData.bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!bookingData.eventTime) {
      throw new BadRequestException('Event time slot is required');
    }
    if (!bookingData.numberOfGuests) {
      throw new BadRequestException('Number of guests is required');
    }

    // ── 3. PARSE AND VALIDATE BOOKING DATE ──────────────────
    const bookingDate = new Date(bookingData.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    // ── 4. VALIDATE EVENT TIME SLOT ─────────────────────────
    const normalizedEventTime = bookingData.eventTime.toUpperCase() as
      | 'MORNING'
      | 'EVENING'
      | 'NIGHT';
    const validEventTimes = ['MORNING', 'EVENING', 'NIGHT'];

    if (!validEventTimes.includes(normalizedEventTime)) {
      throw new BadRequestException(
        'Invalid event time. Must be MORNING, EVENING, or NIGHT',
      );
    }

    // ── 5. CHECK IF LAWN IS ACTIVE ──────────────────────────
    if (!lawnExists.isActive) {
      throw new ConflictException(
        `Lawn '${lawnExists.description}' is not active for bookings`,
      );
    }

    // ── 6. CHECK IF LAWN IS ON HOLD ─────────────────────────
    if (lawnExists.holdings && lawnExists.holdings.length > 0) {
      const activeHold = lawnExists.holdings[0];
      // Check if the hold is by a different user
      if (activeHold.holdBy !== bookingData.membership_no?.toString()) {
        throw new ConflictException(
          `Lawn '${lawnExists.description}' is currently on hold by another user`,
        );
      }
    }

    // ── 7. CHECK MULTIPLE OUT OF SERVICE PERIODS ─────────────────────
    // First, check if lawn is currently out of service (based on current periods)
    const isCurrentlyOutOfOrder = this.isCurrentlyOutOfOrder(
      lawnExists.outOfOrders,
    );

    if (isCurrentlyOutOfOrder) {
      // Find the current out-of-order period
      const currentPeriod = this.getCurrentOutOfOrderPeriod(
        lawnExists.outOfOrders,
      );
      if (currentPeriod) {
        throw new ConflictException(
          `Lawn '${lawnExists.description}' is currently out of service from ${currentPeriod.startDate.toLocaleDateString()} to ${currentPeriod.endDate.toLocaleDateString()}${currentPeriod.reason ? `: ${currentPeriod.reason}` : ''}`,
        );
      }
    }

    // ── 8. CHECK IF BOOKING DATE FALLS WITHIN ANY OUT-OF-ORDER PERIOD ──
    if (lawnExists.outOfOrders && lawnExists.outOfOrders.length > 0) {
      const conflictingPeriod = lawnExists.outOfOrders.find((period) => {
        const periodStart = new Date(period.startDate);
        const periodEnd = new Date(period.endDate);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(0, 0, 0, 0);

        return bookingDate >= periodStart && bookingDate <= periodEnd;
      });

      if (conflictingPeriod) {
        const startDate = new Date(conflictingPeriod.startDate);
        const endDate = new Date(conflictingPeriod.endDate);

        const isScheduled = startDate > today;

        if (isScheduled) {
          throw new ConflictException(
            `Lawn '${lawnExists.description}' has scheduled maintenance from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}${conflictingPeriod.reason ? `: ${conflictingPeriod.reason}` : ''}`,
          );
        } else {
          throw new ConflictException(
            `Lawn '${lawnExists.description}' is out of service from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}${conflictingPeriod.reason ? `: ${conflictingPeriod.reason}` : ''}`,
          );
        }
      }
    }

    // ── 9. CHECK GUEST COUNT AGAINST CAPACITY ───────────────
    if (bookingData.numberOfGuests < (lawnExists.minGuests || 0)) {
      throw new ConflictException(
        `Number of guests (${bookingData.numberOfGuests}) is below the minimum requirement of ${lawnExists.minGuests} for this lawn`,
      );
    }

    if (bookingData.numberOfGuests > lawnExists.maxGuests) {
      throw new ConflictException(
        `Number of guests (${bookingData.numberOfGuests}) exceeds the maximum capacity of ${lawnExists.maxGuests} for this lawn`,
      );
    }

    // ── 10. CHECK FOR EXISTING BOOKINGS ──────────────────────
    const existingBooking = await this.prismaService.lawnBooking.findFirst({
      where: {
        lawnId: lawnExists.id,
        bookingDate: bookingDate,
        bookingTime: normalizedEventTime,
      },
    });

    if (existingBooking) {
      const timeSlotMap = {
        MORNING: 'Morning (8:00 AM - 2:00 PM)',
        EVENING: 'Evening (2:00 PM - 8:00 PM)',
        NIGHT: 'Night (8:00 PM - 12:00 AM)',
      };

      throw new ConflictException(
        `Lawn '${lawnExists.description}' is already booked for ${bookingDate.toLocaleDateString()} during ${timeSlotMap[normalizedEventTime]}`,
      );
    }

    // ── 11. CALCULATE TOTAL PRICE ───────────────────────────
    const basePrice =
      bookingData.pricingType === 'member'
        ? lawnExists.memberCharges
        : lawnExists.guestCharges;
    const totalPrice = Number(basePrice);

    // Calculate capacity and pricing
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // create temporary(unconfirmed) booking
    const booking = await this.prismaService.lawnBooking.create({
      data: {
        memberId: member.Sno, // Wait, I need to fetch 'member' in genInvoiceLawn too
        lawnId: lawnExists.id,
        bookingDate: bookingDate,
        bookingTime: normalizedEventTime,
        guestsCount: bookingData.numberOfGuests,
        eventType: bookingData.eventType || '',
        totalPrice: totalPrice,
        pricingType: bookingData.pricingType,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        pendingAmount: totalPrice,
        guestName: bookingData.guestName,
        guestContact: bookingData.guestContact?.toString(),
        isConfirmed: false,
        paidBy: 'MEMBER',
      }
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'LAWN',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: "FULL_PAYMENT",
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Lawn booking voucher for ${lawnExists.description}`,
      expiresAt: holdExpiry
    });

    // dummy api call to confirm
    if (voucher) {
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:3000/api/payment/confirm/LAWN/${booking.id}`, {
            method: 'POST'
          });
        } catch (e) {
          console.error("Dummy confirmation call failed for LAWN", e);
        }
      }, 5000);

      return voucher;
    }
    throw new HttpException('Failed to create voucher', 500);
  }

  // Helper methods
  private isCurrentlyOutOfOrder(outOfOrders: any[]): boolean {
    if (!outOfOrders || outOfOrders.length === 0) return false;

    const now = new Date();
    return outOfOrders.some((period) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return start <= now && end >= now;
    });
  }

  private getCurrentOutOfOrderPeriod(outOfOrders: any[]): any | null {
    if (!outOfOrders || outOfOrders.length === 0) return null;

    const now = new Date();
    return outOfOrders.find((period) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return start <= now && end >= now;
    });
  }

  async genInvoicePhotoshoot(photoshootId: number, bookingData: any) {
    // console.log('Photoshoot booking data received:', bookingData);

    // ── 1. VALIDATE PHOTOSHOOT EXISTS ───────────────────────
    const photoshootExists = await this.prismaService.photoshoot.findFirst({
      where: { id: photoshootId },
    });

    if (!photoshootExists) {
      throw new NotFoundException(`Photoshoot service not found`);
    }

    // ── 2. VALIDATE REQUIRED FIELDS ─────────────────────────
    if (!bookingData.bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!bookingData.timeSlot) {
      throw new BadRequestException('Time slot is required');
    }
    if (!bookingData.membership_no) {
      throw new BadRequestException('Membership number is required');
    }

    // ── 3. VALIDATE MEMBER EXISTS ───────────────────────────
    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: bookingData.membership_no.toString() },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // ── 4. PARSE AND VALIDATE BOOKING DATE & TIME ───────────
    const bookingDate = new Date(bookingData.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    const startTime = parsePakistanDate(bookingData.timeSlot);
    const now = getPakistanDate();

    if (startTime < now) {
      throw new BadRequestException('Booking time cannot be in the past');
    }

    // Validate time slot is between 9am and 6pm (since booking is 2 hours, last slot ends at 8pm)
    const bookingHour = startTime.getHours();
    if (bookingHour < 9 || bookingHour >= 18) {
      throw new BadRequestException(
        'Photoshoot bookings are only available between 9:00 AM and 6:00 PM',
      );
    }

    // ── 5. CALCULATE END TIME ───────────────────────────────
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    // REMOVED: Existing booking check to allow same date/time

    // ── 6. CALCULATE TOTAL PRICE ────────────────────────────
    const basePrice =
      bookingData.pricingType === 'member'
        ? photoshootExists.memberCharges
        : photoshootExists.guestCharges;
    const totalPrice = Number(basePrice);

    // ── 7. CREATE TEMPORARY BOOKING & VOUCHER ───────────
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // create temporary(unconfirmed) booking
    const booking = await this.prismaService.photoshootBooking.create({
      data: {
        memberId: member.Sno,
        photoshootId: photoshootExists.id,
        bookingDate: bookingDate,
        startTime: startTime,
        endTime: endTime,
        totalPrice: totalPrice,
        pricingType: bookingData.pricingType,
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        pendingAmount: totalPrice,
        guestName: bookingData.guestName,
        guestContact: bookingData.guestContact?.toString(),
        isConfirmed: false,
        paidBy: 'MEMBER',
        bookingDetails: JSON.stringify([{ date: bookingData.bookingDate, timeSlot: bookingData.timeSlot }])
      }
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'PHOTOSHOOT',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: "FULL_PAYMENT",
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Photoshoot booking voucher for ${photoshootExists.description}`,
      expiresAt: holdExpiry
    });

    // dummy api call to confirm
    if (voucher) {
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:3000/api/payment/confirm/PHOTOSHOOT/${booking.id}`, {
            method: 'POST'
          });
        } catch (e) {
          console.error("Dummy confirmation call failed for PHOTOSHOOT", e);
        }
      }, 5000);

      return voucher;
    }
    throw new HttpException('Failed to create voucher', 500);
  }

  /////////////////////////////////////////////////////////////////////

  async getMemberVouchers(membershipNo: string) {
    return await this.prismaService.paymentVoucher.findMany({
      where: { membership_no: membershipNo },
      include: {
        member: true,
      },
      orderBy: { issued_at: 'desc' },
    });
  }



  // check idempotency
  async checkIdempo(idempotencyKey: string) {
    console.log(idempotencyKey)
  }
}

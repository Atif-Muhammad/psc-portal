import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BookingDto } from './dtos/booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BookingOpt,
  BookingType,
  PaidBy,
  PaymentMode,
  PaymentStatus,
  Channel,
  Prisma,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import {
  formatPakistanDate,
  getPakistanDate,
  parsePakistanDate,
} from 'src/utils/time';
import { generateNumericVoucherNo, generateConsumerNumber } from 'src/utils/id';
import * as paymentPolicies from 'src/common/config/payment-policies.json';

@Injectable()
export class BookingService {
  constructor(private prismaService: PrismaService) { }

  private formatHallBookingRemarks(
    hallName: string,
    startDate: Date,
    endDate: Date,
    eventType: string,
    bookingDetails: any[],
    eventTime: string,
  ): string {
    const rangeStr =
      startDate.getTime() === endDate.getTime()
        ? formatPakistanDate(startDate)
        : `${formatPakistanDate(startDate)} to ${formatPakistanDate(endDate)}`;

    let remarks = `Hall Booking: ${hallName} | ${rangeStr}`;

    if (
      bookingDetails &&
      Array.isArray(bookingDetails) &&
      bookingDetails.length > 0
    ) {
      const detailsList = bookingDetails
        .map((d) => {
          const dDate = formatPakistanDate(parsePakistanDate(d.date));
          const slot = d.timeSlot;
          const type = d.eventType || eventType;
          return `- ${dDate}: ${slot} (${type})`;
        })
        .join('\n');

      remarks += `\n${detailsList}`;
    } else {
      remarks += `\n- ${rangeStr}: ${eventTime} (${eventType})`;
    }

    return remarks;
  }
  private calculateAdvanceAmount(roomCount: number, totalPrice: number): number {
    if (roomCount === 0) return 0;
    let percentage = 0;
    if (roomCount >= 1 && roomCount <= 2) percentage = 0.25;
    else if (roomCount >= 3 && roomCount <= 5) percentage = 0.5;
    else if (roomCount >= 6) percentage = 0.75;
    return Math.round(totalPrice * percentage);
  }

  async lock() {
    const bookings = await this.prismaService.roomBooking.findMany({
      where: {
        checkIn: {
          lte: new Date(),
        },
        checkOut: {
          gte: new Date(),
        },
      },
      select: { rooms: { select: { roomId: true } } },
    });

    const roomsTobeLocked = bookings.flatMap((b) =>
      b.rooms.map((r) => r.roomId),
    );
    return await this.prismaService.room.updateMany({
      where: { id: { in: roomsTobeLocked }, isBooked: false },
      data: { isBooked: true },
    });
  }


  // unpaid online vouchers
  async unpaidTimerVouchers(membership_no: string) {
    const vouchers = await this.prismaService.paymentVoucher.findMany({
      where: {
        membership_no,
        payment_mode: PaymentMode.ONLINE,
        status: 'PENDING',
        issued_at: {
          gte: new Date(Date.now() - 60 * 60 * 1000)
        },
        expiresAt: {
          gt: new Date(Date.now() - 60 * 60 * 1000)
        }
      },
      orderBy: {
        issued_at: 'desc'
      },
      take: 3,
      include: {
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Email: true,
            Contact_No: true,
          }
        }
      }
    });

    const enhancedVouchers = await Promise.all(vouchers.map(async (voucher) => {
      let bookingData: any = null;
      let roomType: any = null;

      if (voucher.booking_type === 'ROOM') {
        const booking = await this.prismaService.roomBooking.findUnique({
          where: { id: voucher.booking_id },
          include: {
            rooms: {
              include: {
                room: {
                  include: {
                    roomType: true
                  }
                }
              }
            }
          }
        });

        if (booking) {
          const firstRoomType = booking.rooms?.[0]?.room?.roomType;
          roomType = firstRoomType ? {
            id: firstRoomType.id,
            name: firstRoomType.type,
            screen: "details",
            priceMember: firstRoomType.priceMember.toString(),
            priceGuest: firstRoomType.priceGuest.toString(),
            images: firstRoomType.images || [],
            originalData: firstRoomType
          } : null;

          bookingData = {
            checkIn: booking.checkIn.toISOString().split('T')[0],
            checkOut: booking.checkOut.toISOString().split('T')[0],
            numberOfAdults: booking.numberOfAdults,
            numberOfChildren: booking.numberOfChildren,
            numberOfRooms: booking.rooms.length,
            specialRequest: booking.specialRequests || "",
            totalPrice: booking.totalPrice.toString(),
            advanceAmount: this.calculateAdvanceAmount(booking.rooms.length, Number(booking.totalPrice)),
            isGuestBooking: booking.paidBy !== 'MEMBER',
            guestName: booking.guestName || "",
            guestContact: booking.guestContact || ""
          };

          return {
            bookingType: voucher.booking_type,
            voucherData: {
              issue_date: voucher.issued_at,
              due_date: voucher.expiresAt,
              membership: {
                no: voucher.member.Membership_No,
                name: voucher.member.Name,
                email: voucher.member.Email,
                contact: voucher.member.Contact_No
              },
              voucher: {
                ...voucher,
                amount: voucher.amount.toString()
              }
            },
            bookingId: voucher.booking_id,
            invoiceNumber: voucher.invoice_no,
            dueDate: voucher.expiresAt,
            bookingData,
            roomType,
            memberDetails: {
              memberName: voucher.member.Name,
              membershipNo: voucher.member.Membership_No,
              email: voucher.member.Email,
              contact: voucher.member.Contact_No
            },
            isGuest: booking.paidBy !== 'MEMBER'
          };
        }
      }

      // Default structure if booking not found or not ROOM type
      return {
        bookingType: voucher.booking_type,
        voucherData: {
          issue_date: voucher.issued_at,
          due_date: voucher.expiresAt,
          membership: {
            no: voucher.member.Membership_No,
            name: voucher.member.Name,
            email: voucher.member.Email,
            contact: voucher.member.Contact_No
          },
          voucher: {
            ...voucher,
            amount: voucher.amount.toString()
          }
        },
        bookingId: voucher.booking_id,
        invoiceNumber: voucher.invoice_no,
        dueDate: voucher.expiresAt,
        bookingData: null,
        roomType: null,
        memberDetails: {
          memberName: voucher.member.Name,
          membershipNo: voucher.member.Membership_No,
          email: voucher.member.Email,
          contact: voucher.member.Contact_No
        },
        isGuest: false
      };
    }));

    return enhancedVouchers;
  }

  // room booking
  // room booking
  // gBookingsRoom moved to bottom for better organization with new include logic

  async cBookingRoom(payload: BookingDto, createdBy: string) {
    const {
      membershipNo,
      entityId,
      selectedRoomIds,
      checkIn,
      checkOut,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      numberOfAdults = 1,
      numberOfChildren = 0,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestContact,
      guestName,
      guestCNIC,
      reservationId,
      generateAdvanceVoucher,
      advanceVoucherAmount,
      card_number,
      check_number,
      bank_name,
      heads,
    } = payload;

    // ── VALIDATION ───────────────────────────────────────────
    const checkInDate = parsePakistanDate(checkIn!);
    const checkOutDate = parsePakistanDate(checkOut!);

    const now = getPakistanDate();
    now.setHours(0, 0, 0, 0);

    const normalizedCheckIn = new Date(checkInDate);
    normalizedCheckIn.setHours(0, 0, 0, 0);

    if (!checkIn || !checkOut || checkInDate >= checkOutDate)
      throw new ConflictException('Check-in must be before check-out');
    if (normalizedCheckIn < now)
      throw new ConflictException('Check-in date cannot be in the past');
    if (numberOfAdults < 1)
      throw new ConflictException('At least one adult is required');
    if (numberOfAdults + numberOfChildren > 6)
      // This might need to be per room or total? Assuming per booking record.
      throw new ConflictException('Maximum booking capacity exceeded');

    if (pricingType === 'guest' || pricingType === 'forces-guest') {
      if (!guestName || !guestContact) {
        throw new ConflictException(
          'Guest name and contact are required for guest pricing',
        );
      }
    }

    // ── RESOLVE ROOM IDS ─────────────────────────────────────
    const roomIdsToBook =
      selectedRoomIds && selectedRoomIds.length > 0
        ? selectedRoomIds.map((id) => Number(id))
        : entityId
          ? [Number(entityId)]
          : [];

    if (roomIdsToBook.length === 0) {
      throw new BadRequestException('No rooms selected for booking');
    }

    // ── DELETE RESERVATION IF PROVIDED ──────────────────────
    if (reservationId) {
      await this.prismaService.roomReservation.deleteMany({
        where: { id: Number(reservationId) },
      });
    }

    // ── ROOM VALIDATION LOOP ─────────────────────────────────
    const rooms = await this.prismaService.room.findMany({
      where: { id: { in: roomIdsToBook } },
      include: {
        reservations: {
          where: {
            reservedFrom: { lt: checkOutDate },
            reservedTo: { gt: checkInDate },
          },
        },
        outOfOrders: {
          where: {
            startDate: { lt: checkOutDate },
            endDate: { gt: checkInDate },
          },
        },
        bookings: {
          where: {
            booking: {
              checkIn: { lt: checkOutDate },
              checkOut: { gt: checkInDate },
              isCancelled: false,
            },
          },
        },
        roomType: true,
      },
    });

    if (rooms.length !== roomIdsToBook.length) {
      throw new NotFoundException('Some selected rooms were not found');
    }

    const roomNumbers = rooms.map((r) => r.roomNumber).join(', ');

    for (const room of rooms) {
      if (!room.isActive)
        throw new ConflictException(`Room ${room.roomNumber} is not active`);

      // Check holdings with exact dates
      const roomHold = await this.prismaService.roomHoldings.findFirst({
        where: {
          roomId: room.id,
          onHold: true,
          NOT: { holdBy: membershipNo.toString() }, // Don't block self
          OR: [
            {
              // Check for exact date overlap
              checkIn: { lt: checkOutDate },
              checkOut: { gt: checkInDate },
            },
            {
              // Fallback for legacy holds (only expiry)
              checkIn: null,
              holdExpiry: { gt: new Date() },
            },
          ],
        },
      });
      if (roomHold)
        throw new ConflictException(
          `Room ${room.roomNumber} is currently on hold`,
        );

      if (room.outOfOrders.length > 0) {
        throw new ConflictException(
          `Room ${room.roomNumber} has maintenance during this period`,
        );
      }

      if (room.reservations.length > 0) {
        throw new ConflictException(
          `Room ${room.roomNumber} is reserved during this period`,
        );
      }

      if (room.bookings.length > 0) {
        throw new ConflictException(
          `Room ${room.roomNumber} is already booked during this period`,
        );
      }
    }

    const total = Number(totalPrice);
    let intendedPaid = 0;

    const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';

    if (String(paymentStatus) === 'PAID' || paymentStatus === (PaymentStatus.PAID as unknown)) {
      intendedPaid = total;
    } else if (
      String(paymentStatus) === 'HALF_PAID' ||
      paymentStatus === (PaymentStatus.HALF_PAID as unknown) ||
      String(paymentStatus) === 'ADVANCE_PAYMENT' ||
      paymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown)
    ) {
      intendedPaid = Number(paidAmount) || 0;
    } else if (
      String(paymentStatus) === 'TO_BILL' ||
      paymentStatus === (PaymentStatus.TO_BILL as unknown)
    ) {
      // For TO_BILL, we treat any amount provided as the billing amount, not cash.
      // So intendedPaid (cash) is 0, and the whole total becomes owed/billed.
      intendedPaid = 0;
    }

    // For ONLINE, initial paid amount is 0 as we want pending vouchers.
    // For others (even HALF_PAID), it is CONFIRMED immediately, so paid is intendedPaid.
    const paid = (isOnline) ? 0 : intendedPaid;
    const owed = total - paid;

    const isHalfPaid =
      String(paymentStatus) === 'HALF_PAID' ||
      paymentStatus === (PaymentStatus.HALF_PAID as unknown);
    const isToBill =
      String(paymentStatus) === 'TO_BILL' ||
      paymentStatus === (PaymentStatus.TO_BILL as unknown);

    const amountToBalance = isToBill ? owed : 0;
    // For TO_BILL, we treat the booking as 'paid' in the booking module
    // This means paidAmount = total and pendingAmount = 0
    const bookingPaidAmount = isToBill ? total : paid;
    const bookingPendingAmount = isToBill ? 0 : owed;

    // ── CREATE BOOKING ───────────────────────────────────────
    // Create join table entries for each room
    const booking = await this.prismaService.roomBooking.create({
      data: {
        createdAt: getPakistanDate(),
        Membership_No: membershipNo,
        rooms: {
          create: rooms.map((r) => ({
            roomId: r.id,
            priceAtBooking:
              pricingType === 'member'
                ? r.roomType.priceMember
                : pricingType === 'forces' ||
                  pricingType === 'forces-self' ||
                  pricingType === 'forces-guest'
                  ? r.roomType.priceForces || 0
                  : r.roomType.priceGuest,
          })),
        },
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: total,
        paymentStatus: paymentStatus as unknown as PaymentStatus,
        pricingType,
        paidAmount: bookingPaidAmount,
        pendingAmount: bookingPendingAmount,
        numberOfAdults,
        numberOfChildren,
        specialRequests,
        paidBy,
        guestName,
        guestContact: guestContact?.toString(),
        guestCNIC,
        extraCharges: heads || [],
        createdBy,
        updatedBy: '-',
      },
    });

    // ── UPDATE ROOM STATUS ───────────────────────────────────
    if (checkInDate <= now && checkOutDate > now) {
      // Mark all rooms as booked
      await this.prismaService.room.updateMany({
        where: { id: { in: roomIdsToBook } },
        data: { isBooked: true },
      });
    }

    // ── UPDATE MEMBER LEDGER ─────────────────────────────────
    await this.prismaService.member.update({
      where: { Membership_No: membershipNo },
      data: {
        totalBookings: { increment: 1 },
        lastBookingDate: now,
        // For TO_BILL: amount goes to bookingAmountPaid to show as 'paid' in booking module
        bookingAmountPaid: { increment: Math.round(Number(bookingPaidAmount)) },
        bookingAmountDue: { increment: Math.round(Number(bookingPendingAmount)) },
        // For TO_BILL, don't update bookingBalance (it goes to Balance instead)
        bookingBalance: isToBill ? undefined : {
          increment: Math.round(Number(paid) - Number(owed)),
        },
        Balance: { increment: Math.round(amountToBalance) },
        drAmount: { increment: Math.round(amountToBalance) },
      },
    });

    // ── CREATE PAYMENT VOUCHER ───────────────────────────────
    // Track if we've created a main payment voucher to prevent duplicates with advance voucher
    let mainVoucherCreated = false;

    // For TO_BILL status, we still create a payment voucher if some amount was actually PAID
    if (intendedPaid > 0) {
      let voucherType: VoucherType;
      let status: VoucherStatus = isOnline ? VoucherStatus.PENDING : VoucherStatus.CONFIRMED;

      if (String(paymentStatus) === 'PAID' || paymentStatus === (PaymentStatus.PAID as unknown)) {
        voucherType = VoucherType.FULL_PAYMENT;
      } else if (
        String(paymentStatus) === 'ADVANCE_PAYMENT' ||
        paymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown)
      ) {
        voucherType = VoucherType.ADVANCE_PAYMENT;
      } else if (isToBill) {
        // For TO_BILL with partial payment, the voucher is also marked as TO_BILL
        voucherType = VoucherType.TO_BILL;
      } else {
        voucherType = VoucherType.HALF_PAYMENT;
      }

      const vno = generateNumericVoucherNo();
      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          booking_type: 'ROOM',
          booking_id: booking.id,
          membership_no: membershipNo,
          amount: intendedPaid,
          payment_mode: (paymentMode as PaymentMode) || PaymentMode.CASH,
          voucher_type: voucherType as VoucherType,
          status: status,
          issued_by: createdBy || 'admin',
          paid_at: status === VoucherStatus.CONFIRMED ? new Date() : null,
          card_number: card_number,
          check_number: check_number,
          bank_name: bank_name,
          expiresAt: isOnline ? new Date(Date.now() + 60 * 60 * 1000) : null,
          remarks: `${isOnline ? 'ONLINE ' : ''}${isHalfPaid || isToBill ? 'PARTIAL PAYMENT ' : ''}Rooms: ${roomNumbers} | ${formatPakistanDate(checkInDate)} → ${formatPakistanDate(checkOutDate)} | Guests: ${numberOfAdults}A/${numberOfChildren}C${specialRequests ? ` | ${specialRequests}` : ''}`,
        } as any,
      });
      mainVoucherCreated = true;
    }

    // ── CREATE TO_BILL VOUCHER IF APPLICABLE ─────────────────
    // When TO_BILL is selected, create a TO_BILL voucher for the amount being added to balance
    if (isToBill && owed > 0) {
      const vno = generateNumericVoucherNo();
      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          booking_type: 'ROOM',
          booking_id: booking.id,
          membership_no: membershipNo,
          amount: owed,
          payment_mode: PaymentMode.CASH,
          voucher_type: VoucherType.TO_BILL,
          status: VoucherStatus.CONFIRMED,
          issued_by: createdBy || 'admin',
          paid_at: new Date(),
          remarks: `TO BILL - Rooms: ${roomNumbers} | ${formatPakistanDate(checkInDate)} → ${formatPakistanDate(checkOutDate)} | Total: Rs.${total}, Paid: Rs.${paid}, Balance: Rs.${owed}`,
        } as any,
      });
    }

    // ── CREATE ADVANCE PAYMENT VOUCHER ───────────────────────
    // Only create if:
    // 1. generateAdvanceVoucher flag is set AND amount > 0
    // 2. We haven't already created an ADVANCE_PAYMENT voucher above
    // 3. The advance amount is different from the main payment (to prevent exact duplicates)
    if (
      generateAdvanceVoucher &&
      Number(advanceVoucherAmount) > 0 &&
      !(mainVoucherCreated &&
        String(paymentStatus) === 'ADVANCE_PAYMENT' &&
        Number(advanceVoucherAmount) === intendedPaid)
    ) {
      const vno = generateNumericVoucherNo();
      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          booking_type: 'ROOM',
          booking_id: booking.id,
          membership_no: membershipNo,
          amount: Number(advanceVoucherAmount),
          payment_mode: PaymentMode.CASH,
          voucher_type: VoucherType.ADVANCE_PAYMENT,
          status: VoucherStatus.PENDING,
          issued_by: createdBy || 'admin',
          paid_at: null,
          remarks: `Advance payment for room booking: ${roomNumbers} from ${formatPakistanDate(checkInDate)} to ${formatPakistanDate(checkOutDate)}. Total Price: Rs. ${total}`,
        } as any,
      });
    }

    // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
    await this.prismaService.roomHoldings.deleteMany({
      where: { roomId: { in: roomIdsToBook }, holdBy: membershipNo.toString() },
    });

    return booking;
  }

  async uBookingRoom(payload: Partial<BookingDto>, updatedBy: string) {
    const {
      id,
      membershipNo,
      entityId,
      selectedRoomIds,
      checkIn,
      checkOut,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      numberOfAdults,
      numberOfChildren,
      specialRequests,
      remarks,
      paidBy = 'MEMBER',
      guestContact,
      guestName,
      guestCNIC,
      card_number,
      check_number,
      bank_name,
      generateAdvanceVoucher,
      advanceVoucherAmount,
      heads,
    } = payload;

    if (!id) throw new BadRequestException('Booking ID required');

    // ── FETCH EXISTING ──────────────────────────────────────
    const booking = await this.prismaService.roomBooking.findUnique({
      where: { id: Number(id) },
      include: {
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
    });
    if (!booking) throw new UnprocessableEntityException('Booking not found');

    // ── DATA PREP ──────────────────────────────────────────
    const currentRoomIds = booking.rooms.map((r) => r.roomId);

    const newCheckIn = checkIn ? parsePakistanDate(checkIn) : booking.checkIn;
    const newCheckOut = checkOut
      ? parsePakistanDate(checkOut)
      : booking.checkOut;

    // Normalize dates
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const normalizedNewCheckIn = new Date(newCheckIn);
    normalizedNewCheckIn.setHours(0, 0, 0, 0);

    if (newCheckIn >= newCheckOut)
      throw new ConflictException('Check-in must be before check-out');

    // ── GUEST COUNT VALIDATION ──────────────────────────────
    const newAdults = numberOfAdults ?? booking.numberOfAdults;
    const newChildren = numberOfChildren ?? booking.numberOfChildren;
    if (newAdults < 1)
      throw new ConflictException('At least one adult is required');
    if (newAdults + newChildren > 6)
      throw new ConflictException('Max capacity exceeded');

    const newPricingType = pricingType ?? booking.pricingType;
    if (newPricingType === 'guest' || newPricingType === 'forces-guest') {
      const newGuestName = guestName ?? booking.guestName;
      const newGuestContact = guestContact ?? booking.guestContact;
      if (!newGuestName || !newGuestContact) {
        throw new ConflictException(
          'Guest name and contact are required for guest pricing',
        );
      }
    }

    // ── ROOM SELECTION ──────────────────────────────────────
    // If selectedRoomIds or entityId provided, use them. Else use current rooms.
    let targetRoomIds: number[] = [];
    if (selectedRoomIds && selectedRoomIds.length > 0) {
      targetRoomIds = selectedRoomIds.map(Number);
    } else if (entityId) {
      targetRoomIds = [Number(entityId)];
    } else {
      targetRoomIds = currentRoomIds;
    }

    if (targetRoomIds.length === 0)
      throw new BadRequestException('No rooms part of this booking');

    // ── ROOM VALIDATION ─────────────────────────────────────
    const rooms = await this.prismaService.room.findMany({
      where: { id: { in: targetRoomIds } },
      include: {
        outOfOrders: {
          where: {
            startDate: { lt: newCheckOut },
            endDate: { gt: newCheckIn },
          },
        },
        reservations: {
          where: {
            reservedFrom: { lt: newCheckOut },
            reservedTo: { gt: newCheckIn },
          },
        },
        bookings: {
          where: {
            bookingId: { not: booking.id }, // Exclude current booking
            booking: {
              checkIn: { lt: newCheckOut },
              checkOut: { gt: newCheckIn },
              isCancelled: false,
            },
          },
        },
        roomType: true,
      },
    });

    if (rooms.length !== targetRoomIds.length)
      throw new NotFoundException('Some rooms not found');

    const roomNumbers = rooms.map((r) => r.roomNumber).join(', ');

    for (const room of rooms) {
      if (!room.isActive)
        throw new ConflictException(`Room ${room.roomNumber} not active`);

      // Check holdings
      // Check holdings with exact dates
      const roomHold = await this.prismaService.roomHoldings.findFirst({
        where: {
          roomId: room.id,
          onHold: true,
          OR: [
            {
              checkIn: { lt: newCheckOut },
              checkOut: { gt: newCheckIn },
            },
            {
              checkIn: null,
              holdExpiry: { gt: new Date() },
            },
          ],
          // Exclude holds by this booking's user?
          // Assuming user might be updating their own booking, but the hold might be separate.
          // Ideally we should exclude holds linked to THIS booking, but holds aren't linked to bookings by ID.
          // We can exclude holds by this `membershipNo` if we assume 1 active booking/process per user.
          // But safe to just alert conflict if blocked.
          // NOT: { holdBy: booking.Membership_No } // logic below exists in member update, maybe add here?
          // Adding exclusion for same member to allow updates
          NOT: { holdBy: booking.Membership_No },
        },
      });
      if (roomHold)
        throw new ConflictException(
          `Room ${room.roomNumber} is currently on hold`,
        );

      if (room.outOfOrders.length > 0)
        throw new ConflictException(`Room ${room.roomNumber} has maintenance`);
      if (room.reservations.length > 0)
        throw new ConflictException(`Room ${room.roomNumber} is reserved`);
      if (room.bookings.length > 0)
        throw new ConflictException(
          `Room ${room.roomNumber} is already booked`,
        );
    }

    // ── PAYMENT CALCULATIONS ────────────────────────────────
    const currTotal = Number(booking.totalPrice);
    const currPaid = Number(booking.paidAmount);
    const currStatus = booking.paymentStatus;

    // Favor payload values, fall back to current values
    let newPaymentStatus: PaymentStatus =
      (paymentStatus as unknown as PaymentStatus) || currStatus;
    const newTotal = totalPrice !== undefined ? Number(totalPrice) : currTotal;

    // Check for price increase without explicit payment change
    const isPriceIncrease = newTotal > currPaid;
    const isExplicitStatusChange = paymentStatus !== undefined;
    const isExplicitPaidAmount = paidAmount !== undefined;

    let newPaid = currPaid;

    // Respect manual status changes and amounts from UI
    if (String(newPaymentStatus) === 'PAID') {
      newPaid = isExplicitPaidAmount ? Number(paidAmount) : Math.max(newTotal, currPaid);
    } else if (String(newPaymentStatus) === 'UNPAID') {
      newPaid = 0;
    } else if (String(newPaymentStatus) === 'TO_BILL' || newPaymentStatus === (PaymentStatus.TO_BILL as unknown)) {
      // For TO_BILL, we don't count the billing amount as new cash.
      // newPaid stays as whatever cash was previously paid.
      newPaid = currPaid;
    } else {
      newPaid = isExplicitPaidAmount ? Number(paidAmount) : currPaid;
    }

    // ── CRITICAL: For ONLINE payments, don't add amount to booking yet ──
    // The amount will be added by /bill-payment when voucher is confirmed
    // This prevents double-adding: once here and once in /bill-payment
    const isOnline =
      paymentMode === (PaymentMode.ONLINE as unknown) ||
      String(paymentMode) === 'ONLINE';

    let dbPaid = isOnline ? currPaid : newPaid;

    // ── HANDLE TO_BILL STATUS TRANSITION ──────────────────────
    const isCurrentlyToBill = currStatus === (PaymentStatus.TO_BILL as unknown) || String(currStatus) === 'TO_BILL';
    let previouslyBilledAmount = 0;

    // If it was TO_BILL, find exactly how much was billed to know what to reverse
    if (isCurrentlyToBill) {
      const billVouchers = await this.prismaService.paymentVoucher.findMany({
        where: {
          booking_id: booking.id,
          booking_type: 'ROOM',
          voucher_type: VoucherType.TO_BILL,
          status: VoucherStatus.CONFIRMED,
        }
      });
      previouslyBilledAmount = billVouchers.reduce((acc, v) => acc + Number(v.amount), 0);
    }

    // When moving FROM TO_BILL to another status, we reverse the balance entry
    const isMovingFromToBill = isCurrentlyToBill && (newPaymentStatus !== (PaymentStatus.TO_BILL as unknown) && String(newPaymentStatus) !== 'TO_BILL');

    if (isMovingFromToBill && previouslyBilledAmount > 0) {
      // Deduct this amount from member balance (reverse the TO_BILL operation)
      await this.prismaService.member.update({
        where: { Membership_No: membershipNo ?? booking.Membership_No },
        data: {
          Balance: { decrement: Math.round(previouslyBilledAmount) },
          drAmount: { decrement: Math.round(previouslyBilledAmount) },
          // Also revert the settlement in bookingAmountPaid to restore actual cash status for final update
          bookingAmountPaid: { decrement: Math.round(previouslyBilledAmount) },
        },
      });
      // Note: We keep the old TO_BILL voucher intact for audit trail
    }

    // Actual cash before this update
    const oldActualCash = isCurrentlyToBill ? (currPaid - previouslyBilledAmount) : currPaid;

    // Adjustment for TO_BILL
    let newOwed = newTotal - dbPaid;
    let amountToBalance = 0;
    const isToBillStatus = newPaymentStatus === (PaymentStatus.TO_BILL as unknown) || newPaymentStatus === 'TO_BILL';

    if (isToBillStatus) {
      amountToBalance = newOwed;
      // For TO_BILL: treat booking as 'paid', so newOwed = 0 for booking record
      newOwed = 0;
    }

    // Calculate booking amounts for the database
    // For TO_BILL: paidAmount = total, pendingAmount = 0 (shows as 'paid')
    // For others: use actual cash amounts
    const bookingPaidAmount = isToBillStatus ? newTotal : dbPaid;
    const bookingPendingAmount = isToBillStatus ? 0 : newOwed;

    // Handle Vouchers and get Refund Amount
    const refundAmount = await this.handleVoucherUpdateUnified(
      booking.id,
      'ROOM',
      membershipNo ?? booking.Membership_No,
      newTotal,
      dbPaid, // Use actual cash paid, not bookingPaidAmount (settlement amount)
      newPaymentStatus,
      currTotal,
      oldActualCash, // Use actual cashpaid from before the update
      currStatus,
      {
        roomNumbers,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        remarks: remarks,
        generateAdvanceVoucher,
        advanceVoucherAmount: Number(advanceVoucherAmount),
        roomCount: targetRoomIds.length,
      },
      (paymentMode as unknown as PaymentMode) || PaymentMode.CASH,
      'admin',
      updatedBy,
      card_number,
      check_number,
      bank_name,
    );

    // Calculate diffs for ledger update. 
    // If we reversed TO_BILL, currPaid for the final update is now effectively oldActualCash
    const referencePaid = isMovingFromToBill ? oldActualCash : currPaid;
    const referenceOwed = isMovingFromToBill ? (currTotal - oldActualCash) : (currTotal - currPaid);

    const paidDiff = bookingPaidAmount - referencePaid;
    const owedDiff = bookingPendingAmount - referenceOwed;

    // ── UPDATE BOOKING ──────────────────────────────────────
    const updated = await this.prismaService.roomBooking.update({
      where: { id: booking.id },
      data: {
        Membership_No: membershipNo ?? booking.Membership_No,
        // Update rooms relation using join table
        rooms: {
          deleteMany: {},
          create: rooms.map((r) => ({
            roomId: r.id,
            priceAtBooking:
              (pricingType ?? booking.pricingType) === 'member'
                ? r.roomType.priceMember
                : ['forces', 'forces-self', 'forces-guest'].includes(
                  pricingType ?? booking.pricingType,
                )
                  ? r.roomType.priceForces || 0
                  : r.roomType.priceGuest,
          })),
        },
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        totalPrice: newTotal,
        paymentStatus: newPaymentStatus,
        pricingType: pricingType ?? booking.pricingType,
        paidAmount: bookingPaidAmount,
        pendingAmount: bookingPendingAmount,
        numberOfAdults: newAdults,
        numberOfChildren: newChildren,
        specialRequests: specialRequests ?? booking.specialRequests,
        remarks: remarks!,
        paidBy,
        guestName,
        guestContact: guestContact?.toString(),
        guestCNIC,
        extraCharges: heads || booking.extraCharges || [],
        refundAmount,
        refundReturned: false,
        updatedBy,
      },
    });

    // ── UPDATE DATES IN VOUCHERS ────────────────────────────
    const datesChanged =
      booking.checkIn.getTime() !== newCheckIn.getTime() ||
      booking.checkOut.getTime() !== newCheckOut.getTime();
    if (
      datesChanged &&
      (newPaymentStatus === 'PAID' || newPaymentStatus === 'HALF_PAID')
    ) {
      await this.updateVoucherDates(
        booking.id,
        newCheckIn,
        newCheckOut,
        remarks,
      );
    }

    // ── CLEAR TEMPORARY HOLDS ────────────────────────────────
    await this.prismaService.roomHoldings.deleteMany({
      where: {
        roomId: { in: targetRoomIds },
        holdBy: (membershipNo ?? booking.Membership_No).toString(),
      },
    });

    // ── UPDATE ROOM STATUS ───────────────────────────────────
    await this.updateRoomStatusMulti(
      currentRoomIds,
      targetRoomIds,
      newCheckIn,
      newCheckOut,
    );

    // ── UPDATE MEMBER LEDGER ─────────────────────────────────
    if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
      await this.prismaService.member.update({
        where: { Membership_No: membershipNo ?? booking.Membership_No },
        data: {
          bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
          bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
          bookingBalance: {
            increment: Math.round(Number(paidDiff) - Number(owedDiff)),
          },
          lastBookingDate: new Date(),
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });
    }

    return { ...updated, prevRoomId: booking.roomId };
  }

  async gBookingsRoom(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          none: { status: 'PENDING' }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        cancellationRequests: true,
        rooms: {
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                roomType: {
                  select: { type: true, id: true },
                },
              },
            },
          },
        },
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
      },
    };


    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.roomBooking.findMany(args);
    return bookings.map(b => this.attachActiveCancellationRequest(b));
  }

  async gCancelledBookingsRoom(page?: number, limit?: number) {
    const args: any = {
      where: { isCancelled: true },
      orderBy: { createdAt: 'desc' },
      include: {
        rooms: {
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                roomType: {
                  select: { type: true, id: true },
                },
              },
            },
          },
        },
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.roomBooking.findMany(args);
    return bookings.map(b => this.attachActiveCancellationRequest(b));
  }

  async gCancellationRequestsRoom(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          some: {
            status: 'PENDING',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rooms: {
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                roomType: {
                  select: { type: true, id: true },
                },
              },
            },
          },
        },
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.roomBooking.findMany(args);
    return bookings.map(b => this.attachActiveCancellationRequest(b));
  }

  async gCancelledBookingsHall(page?: number, limit?: number) {
    const args: any = {
      where: { isCancelled: true },
      orderBy: { createdAt: 'desc' },
      include: {
        hall: true,
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.hallBooking.findMany(args);
    return bookings.map((b) => this.attachActiveCancellationRequest(b));
  }

  async gCancellationRequestsHall(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          some: {
            status: 'PENDING',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        hall: true,
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.hallBooking.findMany(args);
    return bookings.map((b) => this.attachActiveCancellationRequest(b));
  }

  async gCancelledBookingsLawn(page?: number, limit?: number) {
    const args: any = {
      where: { isCancelled: true },
      orderBy: { createdAt: 'desc' },
      include: {
        lawn: {
          include: { lawnCategory: true },
        },
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.lawnBooking.findMany(args);
    return bookings.map((b) => this.attachActiveCancellationRequest(b));
  }

  async gCancellationRequestsLawn(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          some: {
            status: 'PENDING',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lawn: {
          include: { lawnCategory: true },
        },
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.lawnBooking.findMany(args);
    return bookings.map((b) => this.attachActiveCancellationRequest(b));
  }


  private formatLawnBookingRemarks(
    lawnName: string,
    bookingDetails: any[],
    fallbackDate: Date,
    fallbackTime: string,
  ): string {
    let remarks = `Lawn Booking: ${lawnName}`;

    if (
      bookingDetails &&
      Array.isArray(bookingDetails) &&
      bookingDetails.length > 0
    ) {
      const detailsList = bookingDetails
        .map((d) => {
          const dDate = formatPakistanDate(parsePakistanDate(d.date));
          const slot = d.timeSlot;
          const type = d.eventType || '';
          return `- ${dDate}: ${slot} ${type ? `(${type})` : ''}`;
        })
        .join('\n');

      remarks += `\n${detailsList}`;
    } else {
      remarks += ` | ${formatPakistanDate(fallbackDate)} (${fallbackTime})`;
    }

    return remarks;
  }

  private async handleVoucherUpdateUnified(
    bookingId: number,
    bookingType: 'ROOM' | 'HALL' | 'LAWN' | 'PHOTOSHOOT',
    membershipNo: string,
    newTotal: number,
    newPaid: number,
    newStatus: PaymentStatus,
    oldTotal: number,
    oldPaid: number,
    oldStatus: PaymentStatus,
    details: {
      roomNumbers?: string;
      hallName?: string;
      lawnName?: string;
      photoshootDesc?: string;
      checkIn?: Date;
      checkOut?: Date;
      bookingDate?: Date;
      endDate?: Date;
      eventTime?: string;
      eventType?: string;
      bookingDetails?: any[];
      generateAdvanceVoucher?: boolean;
      advanceVoucherAmount?: number;
      remarks?: string;
      roomCount?: number;
    },
    paymentMode: PaymentMode = PaymentMode.CASH,
    issuedBy: string = 'admin',
    updatedBy: string = 'system',
    card_number?: string,
    check_number?: string,
    bank_name?: string,
  ) {
    const paidDiff = newPaid - oldPaid;
    let refundAmount = 0;

    // Track if we created a voucher during this execution to prevent duplicates
    let voucherCreatedForPaymentIncrease = false;
    let voucherAmountCreated = 0;
    let voucherCreatedIsOnline = false;

    const roomCount = bookingType === 'ROOM' ? details.roomCount || 0 : 1;
    const oldRequiredAdvance = this.calculateAdvanceAmount(roomCount, oldTotal);
    const newRequiredAdvance = this.calculateAdvanceAmount(roomCount, newTotal);

    // Downgrade Check: If status changed from PAID to HALF_PAID, update existing vouchers
    if (
      (oldStatus === (PaymentStatus.PAID as unknown) || oldStatus === 'PAID') &&
      (newStatus === (PaymentStatus.HALF_PAID as unknown) ||
        newStatus === 'HALF_PAID')
    ) {
      await this.prismaService.paymentVoucher.updateMany({
        where: {
          booking_id: bookingId,
          booking_type: bookingType,
          status: VoucherStatus.CONFIRMED,
          voucher_type: VoucherType.FULL_PAYMENT,
        },
        data: { voucher_type: VoucherType.HALF_PAYMENT },
      });
    }

    // Remark Append Helper
    const appendUpdateRemark = async (newText: string) => {
      const existingVouchers = await this.prismaService.paymentVoucher.findMany({
        where: { booking_id: bookingId, booking_type: bookingType },
      });

      for (const v of existingVouchers) {
        if (!v?.remarks?.includes(`UPDATE: ${newText}`)) {
          await this.prismaService.paymentVoucher.update({
            where: { id: v.id },
            data: { remarks: `${v.remarks} | UPDATE: ${newText}` },
          });
        }
      }
    };

    const commonData = {
      booking_id: bookingId,
      booking_type: bookingType,
      membership_no: membershipNo,
      payment_mode: paymentMode,
      issued_by: issuedBy,
      card_number,
      check_number,
      bank_name,
    };

    let itemInfo = '';
    let dateInfo = '';
    if (bookingType === 'ROOM') {
      itemInfo = `Rooms: ${details.roomNumbers}`;
      dateInfo = `${formatPakistanDate(details.checkIn!)} → ${formatPakistanDate(details.checkOut!)}`;
    } else if (bookingType === 'HALL') {
      itemInfo = details.hallName || 'Hall';
      dateInfo = `${formatPakistanDate(details.bookingDate!)} (${details.eventType}) - ${details.eventTime}`;
    } else if (bookingType === 'LAWN') {
      itemInfo = details.lawnName || 'Lawn';
      dateInfo = `${formatPakistanDate(details.bookingDate!)} (${details.eventTime})`;
    } else if (bookingType === 'PHOTOSHOOT') {
      itemInfo = details.photoshootDesc || 'Photoshoot';
      dateInfo = `${formatPakistanDate(details.bookingDate!)} (${details.eventTime})`;
    }

    const baseRemarks =
      bookingType === 'HALL'
        ? this.formatHallBookingRemarks(
          details.hallName || 'Hall',
          details.bookingDate!,
          details.endDate || details.bookingDate!,
          details.eventType!,
          details.bookingDetails || [],
          details.eventTime!,
        ) + (details.remarks ? ` | ${details.remarks}` : '')
        : bookingType === 'LAWN'
          ? this.formatLawnBookingRemarks(
            details.lawnName || 'Lawn',
            details.bookingDetails || [],
            details.bookingDate!,
            details.eventTime!,
          ) + (details.remarks ? ` | ${details.remarks}` : '')
          : `${itemInfo} | ${dateInfo}${details.remarks ? ` | ${details.remarks}` : ''}`;

    // ── HANDLE TRANSITION TO TO_BILL STATUS ──────────────────
    // When status changes TO TO_BILL, create a TO_BILL voucher for the pending amount
    const isMovingToToBill =
      (oldStatus !== (PaymentStatus.TO_BILL as unknown) && String(oldStatus) !== 'TO_BILL') &&
      (newStatus === (PaymentStatus.TO_BILL as unknown) || String(newStatus) === 'TO_BILL');

    if (isMovingToToBill) {
      const pendingAmount = newTotal - newPaid;
      if (pendingAmount > 0) {
        const vno = generateNumericVoucherNo();
        const toBillText = `Status changed to TO_BILL - Pending amount added to member balance`;

        await this.prismaService.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            ...commonData,
            amount: pendingAmount,
            voucher_type: VoucherType.TO_BILL,
            status: VoucherStatus.CONFIRMED,
            paid_at: new Date(),
            remarks: `${baseRemarks} | UPDATE: ${toBillText}`,
          } as any,
        });

        await appendUpdateRemark(toBillText);
      }
    } else if (
      (oldStatus === (PaymentStatus.TO_BILL as unknown) || String(oldStatus) === 'TO_BILL') &&
      (newStatus === (PaymentStatus.TO_BILL as unknown) || String(newStatus) === 'TO_BILL')
    ) {
      // Price increase while remaining in TO_BILL status
      const oldBilled = oldTotal - oldPaid;
      const newBilled = newTotal - newPaid;
      const billedDiff = newBilled - oldBilled;

      if (billedDiff > 0) {
        const vno = generateNumericVoucherNo();
        const billedUpdateText = `Billed amount increased for TO_BILL - Additional ${billedDiff} added to member balance`;

        await this.prismaService.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            ...commonData,
            amount: billedDiff,
            voucher_type: VoucherType.TO_BILL,
            status: VoucherStatus.CONFIRMED,
            paid_at: new Date(),
            remarks: `${baseRemarks} | UPDATE: ${billedUpdateText}`,
          } as any,
        });

        await appendUpdateRemark(billedUpdateText);
      }
    }

    if (paidDiff < 0) {
      const updateText = `Payment decreased from ${oldPaid} to ${newPaid}`;
      await appendUpdateRemark(updateText);
    } else if (paidDiff > 0) {
      const vno = generateNumericVoucherNo();
      const updateText = `Payment increased by ${paidDiff} (Total now ${newPaid})`;

      let vType: VoucherType =
        newStatus === (PaymentStatus.PAID as unknown) || newStatus === 'PAID'
          ? VoucherType.FULL_PAYMENT
          : VoucherType.HALF_PAYMENT;
      let vStatus: VoucherStatus = VoucherStatus.CONFIRMED;

      const isAdvanceStatus =
        newStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) ||
        newStatus === 'ADVANCE_PAYMENT';
      const isToBillStatus =
        newStatus === (PaymentStatus.TO_BILL as unknown) ||
        newStatus === 'TO_BILL';
      const isOnline =
        paymentMode === (PaymentMode.ONLINE as unknown) ||
        String(paymentMode) === 'ONLINE';

      if (isAdvanceStatus || isOnline) {
        vType = VoucherType.ADVANCE_PAYMENT;
        vStatus = isOnline ? VoucherStatus.PENDING : VoucherStatus.CONFIRMED;
      } else if (isToBillStatus) {
        vType = VoucherType.TO_BILL;
        vStatus = VoucherStatus.CONFIRMED;
      }

      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          ...commonData,
          amount: paidDiff,
          voucher_type: vType,
          status: vStatus,
          paid_at: vStatus === VoucherStatus.CONFIRMED ? new Date() : null,
          card_number: card_number,
          check_number: check_number,
          bank_name: bank_name,
          expiresAt: isOnline ? new Date(Date.now() + 60 * 60 * 1000) : null,
          remarks: `${baseRemarks} | UPDATE: ${updateText}`,
        } as any,
      });

      // Mark that we created a voucher and track the amount and type
      voucherCreatedForPaymentIncrease = true;
      voucherAmountCreated = paidDiff;
      voucherCreatedIsOnline = isOnline;

      await appendUpdateRemark(updateText);
    }

    const effectivePaid = Math.max(newPaid, oldPaid);
    if (effectivePaid > newTotal) {
      refundAmount = effectivePaid - newTotal;
      const refundVno = generateNumericVoucherNo();
      const refundText = `Overpayment Refund: Effective ${effectivePaid} for total ${newTotal}`;

      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(refundVno)),
          voucher_no: refundVno,
          ...commonData,
          amount: refundAmount,
          payment_mode: PaymentMode.CASH,
          voucher_type: VoucherType.REFUND,
          status: VoucherStatus.PENDING,
          paid_at: null,
          remarks: `${baseRemarks} | UPDATE: ${refundText}`,
        } as any,
      });

      await appendUpdateRemark(refundText);
    }

    if (
      newTotal > oldTotal &&
      (newStatus === 'ADVANCE_PAYMENT' || oldStatus === 'ADVANCE_PAYMENT')
    ) {
      const confirmedAdvanceVouchers =
        await this.prismaService.paymentVoucher.findMany({
          where: {
            booking_id: bookingId,
            booking_type: bookingType,
            status: VoucherStatus.CONFIRMED,
            voucher_type: VoucherType.ADVANCE_PAYMENT,
          },
        });
      const totalAdvancePaid = confirmedAdvanceVouchers.reduce(
        (acc, v) => acc + Number(v.amount),
        0,
      );

      if (
        totalAdvancePaid >= oldRequiredAdvance &&
        newRequiredAdvance > totalAdvancePaid
      ) {
        const advDiff = newRequiredAdvance - totalAdvancePaid;

        // ── PREVENT DUPLICATE: Don't create if we already created a voucher for payment increase
        // with the same amount (this happens when payment increase matches advance requirement increase)
        const shouldCreateAdvanceVoucher = !(
          voucherCreatedForPaymentIncrease &&
          voucherAmountCreated === advDiff
        );

        if (shouldCreateAdvanceVoucher) {
          const advVno = generateNumericVoucherNo();
          const advUpdateText = `Required advance increased from ${oldRequiredAdvance} to ${newRequiredAdvance}`;

          await this.prismaService.paymentVoucher.create({
            data: {
              consumer_number: generateConsumerNumber(Number(advVno)),
              voucher_no: advVno,
              ...commonData,
              amount: advDiff,
              voucher_type: VoucherType.ADVANCE_PAYMENT,
              status: VoucherStatus.PENDING,
              paid_at: null,
              remarks: `${baseRemarks} | UPDATE: ${advUpdateText}`,
            } as any,
          });
          await appendUpdateRemark(advUpdateText);
        }
      }
    }

    // ── HANDLE PRICE DECREASE: Refund Advance Overpayment ───────
    if (
      newTotal < oldTotal &&
      (newStatus === 'ADVANCE_PAYMENT' ||
        newStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown))
    ) {
      const confirmedAdvanceVouchers =
        await this.prismaService.paymentVoucher.findMany({
          where: {
            booking_id: bookingId,
            booking_type: bookingType,
            voucher_type: VoucherType.ADVANCE_PAYMENT,
            status: VoucherStatus.CONFIRMED, // Only count confirmed/paid advances
          },
        });
      const totalAdvancePaid = confirmedAdvanceVouchers.reduce(
        (acc, v) => acc + Number(v.amount),
        0,
      );

      // If user paid more advance than now required, generate refund voucher
      if (totalAdvancePaid > newRequiredAdvance) {
        const advanceRefundAmount = totalAdvancePaid - newRequiredAdvance;
        const refundVno = generateNumericVoucherNo();
        const refundText = `Advance overpayment refund: Paid ${totalAdvancePaid} but only ${newRequiredAdvance} required (total decreased from ${oldTotal} to ${newTotal})`;

        await this.prismaService.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(refundVno)),
            voucher_no: refundVno,
            ...commonData,
            amount: advanceRefundAmount,
            payment_mode: PaymentMode.CASH, // Refunds are typically cash
            voucher_type: VoucherType.REFUND,
            status: VoucherStatus.CONFIRMED, // Auto-approved refund
            paid_at: new Date(), // Mark as paid immediately
            remarks: `${baseRemarks} | UPDATE: ${refundText}`,
          } as any,
        });

        await appendUpdateRemark(refundText);
      }
    }

    // ── PREVENT DUPLICATE ADVANCE VOUCHER ────────────────────────
    // Only create advance voucher if:
    // 1. generateAdvanceVoucher flag is set AND amount > 0
    // 2. We haven't already created a voucher for payment increase with matching amount
    //    (This includes ONLINE payments which become ADVANCE_PAYMENT type vouchers)
    if (
      details.generateAdvanceVoucher &&
      details.advanceVoucherAmount &&
      details.advanceVoucherAmount > 0 &&
      !(voucherCreatedForPaymentIncrease &&
        voucherAmountCreated === details.advanceVoucherAmount)
    ) {
      const vno = generateNumericVoucherNo();
      const advText = `Additional Advance Payment: ${details.advanceVoucherAmount}`;

      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          ...commonData,
          amount: details.advanceVoucherAmount,
          voucher_type: VoucherType.ADVANCE_PAYMENT,
          status: VoucherStatus.PENDING,
          paid_at: null,
          remarks: `${baseRemarks} | UPDATE: ${advText}`,
        } as any,
      });

      await appendUpdateRemark(advText);
    }

    return refundAmount;
  }

  private async updateVoucherDates(
    bookingId: number,
    checkIn: Date,
    checkOut: Date,
    remarks?: string,
  ) {
    const existingVouchers = await this.prismaService.paymentVoucher.findMany({
      where: {
        booking_id: bookingId,
        booking_type: 'ROOM',
      },
    });

    const newDateText = `New Dates: ${formatPakistanDate(checkIn)} to ${formatPakistanDate(checkOut)}${remarks ? ` | ${remarks}` : ''}`;

    for (const v of existingVouchers) {
      if (!v.remarks?.includes(newDateText)) {
        await this.prismaService.paymentVoucher.update({
          where: { id: v.id },
          data: {
            remarks: `${v.remarks} | UPDATE: ${newDateText}`,
          },
        });
      }
    }
  }

  private async updateRoomStatus(
    oldRoomId: number,
    newRoomId: number,
    checkIn: Date,
    checkOut: Date,
  ) {
    // Legacy support wrapper
    await this.updateRoomStatusMulti(
      [oldRoomId],
      [newRoomId],
      checkIn,
      checkOut,
    );
  }

  private async updateRoomStatusMulti(
    oldRoomIds: number[],
    newRoomIds: number[],
    checkIn: Date,
    checkOut: Date,
  ) {
    const now = getPakistanDate();
    const isCurrentlyBooked = checkIn <= now && checkOut > now;

    // 1. Unbook old rooms that are NOT in the new list
    const roomsToUnbook = oldRoomIds.filter((id) => !newRoomIds.includes(id));
    if (roomsToUnbook.length > 0) {
      await this.prismaService.room.updateMany({
        where: { id: { in: roomsToUnbook } },
        data: { isBooked: false },
      });
    }

    // 2. Book new rooms (or keep booked if they were already)
    if (isCurrentlyBooked && newRoomIds.length > 0) {
      await this.prismaService.room.updateMany({
        where: { id: { in: newRoomIds } },
        data: { isBooked: true },
      });
    } else if (!isCurrentlyBooked && newRoomIds.length > 0) {
      // If the booking is in future, ensure isBooked is false?
      // Logic says "isBooked" means *currently* occupied.
      // So if future booking, we don't set isBooked=true.
      // But if we moved from current->future, we might need to unbook.
      // The check `isCurrentlyBooked` handles this.

      // HOWEVER, if a room was in old list AND new list, and we moved date to future, it should stay unbooked.
      // But if it was isBooked=true because of THIS booking, we need to set it false.
      // Safe bet: Update all newRoomIds to isCurrentlyBooked status.
      await this.prismaService.room.updateMany({
        where: { id: { in: newRoomIds } },
        data: { isBooked: isCurrentlyBooked },
      });
    }
  }

  async cBookingRoomMember(payload: any, createdBy: string = 'member') {
    const {
      membershipNo,
      entityId,
      checkIn,
      checkOut,
      totalPrice,
      paymentStatus = 'PAID',
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      numberOfAdults = 1,
      numberOfChildren = 0,
      specialRequests = '',
      selectedRoomIds,
      paidBy = 'MEMBER',
      guestContact,
      guestName,
      remarks = '',
      card_number,
      check_number,
      bank_name,
    } = payload;

    // ── VALIDATION ───────────────────────────────────────────
    const checkInDate = parsePakistanDate(checkIn);
    const checkOutDate = parsePakistanDate(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!checkIn || !checkOut || checkInDate >= checkOutDate)
      throw new ConflictException('Check-in must be before check-out');
    if (new Date(checkInDate).setHours(0, 0, 0, 0) < today.getTime())
      throw new ConflictException('Check-in date cannot be in the past');
    if (numberOfAdults < 1)
      throw new ConflictException('At least one adult required');

    if (pricingType === 'guest') {
      if (!guestName || !guestContact) {
        throw new ConflictException(
          'Guest name and contact are required for guest pricing',
        );
      }
    }

    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });
    if (!member) throw new NotFoundException('Member not found');

    const roomIdsToBook =
      selectedRoomIds && selectedRoomIds.length > 0
        ? selectedRoomIds.map((id) => Number(id))
        : [Number(entityId)];

    if (roomIdsToBook.length === 0)
      throw new BadRequestException('No rooms selected');

    // ── PROCESS IN TRANSACTION ───────────────────────────────
    return await this.prismaService.$transaction(async (prisma) => {
      // Validate all rooms
      const rooms = await prisma.room.findMany({
        where: { id: { in: roomIdsToBook } },
        include: {
          roomType: true,
          outOfOrders: {
            where: {
              startDate: { lt: checkOutDate },
              endDate: { gt: checkInDate },
            },
          },
          reservations: {
            where: {
              reservedFrom: { lt: checkOutDate },
              reservedTo: { gt: checkInDate },
            },
          },
          bookings: {
            where: {
              booking: {
                checkIn: { lt: checkOutDate },
                checkOut: { gt: checkInDate },
              },
            },
          },
        },
      });

      if (rooms.length !== roomIdsToBook.length)
        throw new NotFoundException('Some selected rooms not found');
      const roomNumbers = rooms.map((r) => r.roomNumber).join(', ');

      for (const room of rooms) {
        if (!room.isActive)
          throw new ConflictException(`Room ${room.roomNumber} is not active`);
        if (room.outOfOrders.length > 0)
          throw new ConflictException(
            `Room ${room.roomNumber} has maintenance`,
          );
        if (room.reservations.length > 0)
          throw new ConflictException(`Room ${room.roomNumber} is reserved`);
        if (room.bookings.length > 0)
          throw new ConflictException(
            `Room ${room.roomNumber} is already booked`,
          );

        const roomHold = await prisma.roomHoldings.findFirst({
          where: {
            roomId: room.id,
            onHold: true,
            OR: [
              {
                checkIn: { lt: checkOutDate },
                checkOut: { gt: checkInDate },
              },
              {
                checkIn: null,
                holdExpiry: { gt: new Date() },
              },
            ],
            // Exclude holds by current user
            NOT: { holdBy: membershipNo.toString() },
          },
        });
        if (roomHold)
          throw new ConflictException(
            `Room ${room.roomNumber} is on hold by another user`,
          );
      }

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60 * 24),
      );

      let calculatedTotal = 0;
      if (totalPrice) {
        calculatedTotal = Number(totalPrice);
      } else {
        for (const room of rooms) {
          const pricePerNight =
            pricingType === 'member'
              ? room.roomType.priceMember
              : pricingType === 'forces'
                ? room.roomType.priceForces || 0
                : room.roomType.priceGuest;
          calculatedTotal += Number(pricePerNight) * nights;
        }
      }
      const total = calculatedTotal;

      let paid = 0;
      let owed = total;

      let amountToBalance = 0;
      const isToBill = paymentStatus === 'TO_BILL';

      if (paymentStatus === 'PAID') {
        paid = total;
        owed = 0;
      } else if (paymentStatus === 'HALF_PAID') {
        paid = Number(paidAmount) || 0;
        if (paid <= 0)
          throw new ConflictException('Paid amount must be > 0 for half-paid');
        if (paid >= total)
          throw new ConflictException(
            'Paid amount must be < total for half-paid',
          );
        owed = total - paid;
      } else {
        paid = Number(paidAmount) || 0;
        owed = total - paid;
      }

      const finalOwed = isToBill ? 0 : owed;
      amountToBalance = isToBill ? owed : 0;

      // ── CREATE BOOKING ──────────────────────────────────
      const booking = await prisma.roomBooking.create({
        data: {
          Membership_No: membershipNo,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalPrice: total,
          paymentStatus: paymentStatus as PaymentStatus,
          pricingType,
          paidAmount: paid,
          pendingAmount: finalOwed,
          numberOfAdults: Number(numberOfAdults),
          numberOfChildren: Number(numberOfChildren),
          specialRequests,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          remarks,
          // Create join table entries
          rooms: {
            create: rooms.map((r) => ({
              roomId: r.id,
              priceAtBooking:
                pricingType === 'member'
                  ? r.roomType.priceMember
                  : r.roomType.priceGuest,
            })),
          },
          createdBy,
          updatedBy: '-',
        },
      });

      // Update Member Ledger
      const now = new Date();
      await prisma.member.update({
        where: { Membership_No: membershipNo },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: now,
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(finalOwed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(finalOwed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // Create Voucher
      if (paid > 0) {
        const voucherType =
          paymentStatus === 'PAID'
            ? VoucherType.FULL_PAYMENT
            : VoucherType.HALF_PAYMENT;
        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'ROOM',
            booking_id: booking.id,
            membership_no: membershipNo,
            amount: paid,
            payment_mode: (paymentMode as PaymentMode) || PaymentMode.CASH,
            voucher_type: voucherType,
            status: VoucherStatus.CONFIRMED,
            issued_by: 'system',
            remarks: `Rooms: ${roomNumbers} | ${formatPakistanDate(checkInDate)} → ${formatPakistanDate(checkOutDate)} | Online Booking`,
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }

      // Update Room Status if current
      const isCurrentlyBooked = checkInDate <= now && checkOutDate > now;
      if (isCurrentlyBooked) {
        await prisma.room.updateMany({
          where: { id: { in: roomIdsToBook } },
          data: { isBooked: true },
        });
      }

      // Create permanent hold record matching booking
      await prisma.roomHoldings.createMany({
        data: rooms.map((r) => ({
          roomId: r.id,
          onHold: true,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          holdExpiry: checkOutDate,
          holdBy: membershipNo.toString(),
        })),
      });

      // Optionally delete OLD/Temporary holds that don't match?
      // For now, removing the deleteMany or changing it to only delete expired/temp ones?
      // Since we just created new ones, we can clean up any 'temp' holds for this user checking in now?
      // But we just created a hold with `membershipNo`.
      // The old code `deleteMany({ where: { ..., holdBy: membershipNo } })` would delete what we just created if we ran it after!
      // So we should delete BEFORE creating, or delete only those specific temp holds.
      // Better: Delete all holds by this user for these rooms, THEN create new ones.
      // This handles "converting" temp hold to permanent.

      // Delete existing holds by this user
      // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
      await prisma.roomHoldings.deleteMany({
        where: {
          roomId: { in: roomIdsToBook },
          holdBy: membershipNo.toString(),
        },
      });

      return {
        success: true,
        message: `Booked ${roomIdsToBook.length} room(s)`,
        booking,
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: finalOwed,
      };
    });
  }

  async uBookingRoomMember(payload: any, updatedBy: string = 'member') {
    const {
      id,
      membershipNo,
      entityId,
      selectedRoomIds,
      checkIn,
      checkOut,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      numberOfAdults = 1,
      numberOfChildren = 0,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestContact,
      guestName,
      remarks,
    } = payload;

    if (!id || !membershipNo)
      throw new BadRequestException('Booking ID and membership required');

    const newCheckIn = parsePakistanDate(checkIn);
    const newCheckOut = parsePakistanDate(checkOut);

    if (!checkIn || !checkOut || newCheckIn >= newCheckOut)
      throw new ConflictException('Check-in must be before check-out');

    // ── FETCH EXISTING ──────────────────────────────────────
    const booking = await this.prismaService.roomBooking.findUnique({
      where: { id: Number(id) },
      include: {
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
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });
    if (!member) throw new NotFoundException('Member not found');

    // ── RESOLVE ROOM IDS ─────────────────────────────────────
    const currentRoomIds = booking.rooms.map((r) => r.roomId);
    const roomIdsToBook =
      selectedRoomIds && selectedRoomIds.length > 0
        ? selectedRoomIds.map((id) => Number(id))
        : currentRoomIds;

    const rooms = await this.prismaService.room.findMany({
      where: { id: { in: roomIdsToBook } },
      include: {
        outOfOrders: {
          where: {
            startDate: { lt: newCheckOut },
            endDate: { gt: newCheckIn },
          },
        },
        roomType: true,
      },
    });

    if (rooms.length === 0) throw new ConflictException('No rooms available');

    const roomNumbers = rooms.map((r) => r.roomNumber).join(', ');

    for (const room of rooms) {
      if (!room.isActive)
        throw new ConflictException(`Room ${room.roomNumber} is not available`);

      // Check holdings
      const roomHold = await this.prismaService.roomHoldings.findFirst({
        where: {
          roomId: room.id,
          onHold: true,
          OR: [
            {
              checkIn: { lt: newCheckOut },
              checkOut: { gt: newCheckIn },
            },
            {
              checkIn: null,
              holdExpiry: { gt: new Date() },
            },
          ],
          NOT: { holdBy: membershipNo.toString() },
        },
      });
      if (roomHold)
        throw new ConflictException(
          `Room ${room.roomNumber} is currently on hold`,
        );

      if (room.outOfOrders.length > 0) {
        const conflicts = room.outOfOrders
          .map(
            (oo) =>
              `${formatPakistanDate(oo.startDate)} to ${formatPakistanDate(oo.endDate)}`,
          )
          .join(', ');
        throw new ConflictException(
          `Room ${room.roomNumber} has maintenance: ${conflicts}`,
        );
      }

      const overlapping = await this.prismaService.roomBooking.findFirst({
        where: {
          rooms: { some: { roomId: room.id } },
          id: { not: Number(id) },
          checkIn: { lt: newCheckOut },
          checkOut: { gt: newCheckIn },
        },
      });
      if (overlapping)
        throw new ConflictException(`Room ${room.roomNumber} already booked`);
    }

    // ── PAYMENT CALCULATIONS ────────────────────────────────
    const currTotal = Number(booking.totalPrice);
    const currPaid = Number(booking.paidAmount);
    const currStatus = booking.paymentStatus;

    // Use total from payload if provided, otherwise calculate based on all rooms
    let calculatedTotal = 0;
    if (totalPrice) {
      calculatedTotal = Number(totalPrice);
    } else {
      const nights = Math.ceil(
        (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      for (const room of rooms) {
        const pricePerNight =
          pricingType === 'member'
            ? room.roomType.priceMember
            : room.roomType.priceGuest;
        calculatedTotal += Number(pricePerNight) * nights;
      }
    }
    const newTotal = calculatedTotal;
    let newPaymentStatus =
      (paymentStatus as unknown as PaymentStatus) || currStatus;

    const isPriceIncrease = newTotal > currPaid;
    // For member update, payload might differ, but logic holds.
    // 'paidAmount' is in payload.
    const isExplicitPayment = paidAmount !== undefined;
    const isStatusUnchanged =
      !paymentStatus ||
      (paymentStatus as unknown as PaymentStatus) === currStatus;

    let newPaid = currPaid;

    if (
      isPriceIncrease &&
      !isExplicitPayment &&
      isStatusUnchanged &&
      currStatus === (PaymentStatus.PAID as unknown)
    ) {
      newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
      newPaid = currPaid;
    } else {
      if (newPaymentStatus === PaymentStatus.PAID) {
        newPaid = newTotal;
      } else if (newPaymentStatus === PaymentStatus.UNPAID) {
        newPaid = 0;
      } else {
        newPaid = paidAmount !== undefined ? Number(paidAmount) : currPaid;
      }
    }

    let newOwed = newTotal - newPaid;
    let amountToBalance = 0;
    if (newPaymentStatus === PaymentStatus.TO_BILL) {
      amountToBalance = newOwed;
      newOwed = 0;
    }

    // Handle Vouchers and get Refund Amount
    const refundAmount = await this.handleVoucherUpdateUnified(
      booking.id,
      'ROOM',
      membershipNo.toString(),
      newTotal,
      newPaid,
      newPaymentStatus,
      currTotal,
      currPaid,
      currStatus,
      {
        roomNumbers,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        remarks: remarks,
      },
      (paymentMode as unknown as PaymentMode) || PaymentMode.CASH,
      'member',
    );

    const paidDiff = newPaid - currPaid;
    const owedDiff = newOwed - (currTotal - currPaid);

    // ── UPDATE BOOKING ──────────────────────────────────────
    const updated = await this.prismaService.roomBooking.update({
      where: { id: Number(id) },
      data: {
        Membership_No: membershipNo ?? booking.Membership_No,
        rooms: {
          deleteMany: {},
          create: rooms.map((r) => ({
            roomId: r.id,
            priceAtBooking:
              pricingType === 'member'
                ? r.roomType.priceMember
                : r.roomType.priceGuest,
          })),
        },
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        totalPrice: newTotal,
        paymentStatus: newPaymentStatus,
        pricingType,
        paidAmount: newPaid,
        pendingAmount: newOwed,
        numberOfAdults,
        numberOfChildren,
        specialRequests,
        remarks: remarks!,
        paidBy,
        guestName,
        guestContact: guestContact?.toString(),
        refundAmount,
        refundReturned: false,
        updatedBy,
      },
    });

    // ── CLEAR TEMPORARY HOLDS ────────────────────────────────
    await this.prismaService.roomHoldings.deleteMany({
      where: {
        roomId: { in: roomIdsToBook },
        holdBy: membershipNo.toString(),
      },
    });

    // ── UPDATE MEMBER LEDGER ─────────────────────────────────
    if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
      await this.prismaService.member.update({
        where: { Membership_No: membershipNo.toString() },
        data: {
          bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
          bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
          bookingBalance: {
            increment: Math.round(Number(paidDiff) - Number(owedDiff)),
          },
          lastBookingDate: new Date(),
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });
    }

    return {
      success: true,
      message: 'Booking updated',
      booking: updated,
      refundAmount,
    };
  }

  async cCancellationRequestRoom(bookingId: number, reason: string, requestedBy?: string) {
    // find booking with rooms before requesting
    const booking = await this.prismaService.roomBooking.findUnique({
      where: { id: bookingId },
      include: {
        rooms: true,
        cancellationRequests: {
          where: { OR: [{ status: 'PENDING' }, { status: "APPROVED" }] },
        }
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Check if there's already a pending cancellation request
    if (booking.cancellationRequests && booking.cancellationRequests.length > 0) {
      throw new BadRequestException('A cancellation request is already pending for this booking');
    }

    return await this.prismaService.roomCancellationRequest.create({
      data: {
        bookingId: booking.id,
        reason: reason || 'Booking cancellation requested by admin',
        requestedBy: requestedBy || 'Admin',
        status: 'PENDING',
      },
    });
  }

  async updateCancellationReq(
    bookingFor: string,
    bookingId: number,
    status: 'APPROVED' | 'REJECTED',
    remarks?: string,
  ) {
    if (bookingFor === 'rooms') {
      const pendingRequest = await this.prismaService.roomCancellationRequest.findFirst({
        where: { bookingId: bookingId, status: 'PENDING' },
      });

      await this.prismaService.roomCancellationRequest.updateMany({
        where: { bookingId: bookingId, status: 'PENDING' },
        data: {
          status: status,
          adminRemarks: remarks || 'Action taken by admin',
        },
      });

      if (status === 'APPROVED' && pendingRequest) {
        return await this.cancelRoomBookingInternal(bookingId, pendingRequest.createdAt);
      }
      return { success: true, message: 'Cancellation request rejected' };
    }
    if (bookingFor === 'halls') {
      const pendingRequest = await this.prismaService.hallCancellationRequest.findFirst({
        where: { bookingId: bookingId, status: 'PENDING' },
      });

      await this.prismaService.hallCancellationRequest.updateMany({
        where: { bookingId: bookingId, status: 'PENDING' },
        data: {
          status: status,
          adminRemarks: remarks || 'Action taken by admin',
        },
      });

      if (status === 'APPROVED' && pendingRequest) {
        return await this.cancelHallBookingInternal(bookingId, pendingRequest.createdAt);
      }
      return { success: true, message: 'Cancellation request rejected' };
    }
    if (bookingFor === 'lawns') {
      const pendingRequest = await this.prismaService.lawnCancellationRequest.findFirst({
        where: { bookingId: bookingId, status: 'PENDING' },
      });

      await this.prismaService.lawnCancellationRequest.updateMany({
        where: { bookingId: bookingId, status: 'PENDING' },
        data: {
          status: status,
          adminRemarks: remarks || 'Action taken by admin',
        },
      });

      if (status === 'APPROVED' && pendingRequest) {
        return await this.cancelLawnBookingInternal(bookingId, pendingRequest.createdAt);
      }
      return { success: true, message: 'Cancellation request rejected' };
    }
    if (bookingFor === 'photoshoots') {
      const pendingRequest = await this.prismaService.photoshootCancellationRequest.findFirst({
        where: { bookingId: bookingId, status: 'PENDING' },
      });

      await this.prismaService.photoshootCancellationRequest.updateMany({
        where: { bookingId: bookingId, status: 'PENDING' },
        data: {
          status: status,
          adminRemarks: remarks || 'Action taken by admin',
        },
      });

      if (status === 'APPROVED' && pendingRequest) {
        return await this.cancelPhotoshootBookingInternal(bookingId, pendingRequest.createdAt);
      }
      return { success: true, message: 'Cancellation request rejected' };
    }
  }

  private async cancelRoomBookingInternal(bookingId: number, requestCreatedAt?: Date) {
    const booking = await this.prismaService.roomBooking.findUnique({
      where: { id: bookingId },
      include: { rooms: { include: { room: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    let refundAmount = 0;
    let deductionAmount = 0;

    if (requestCreatedAt) {
      const result = this.calculateRefund(
        'ROOM',
        Number(booking.totalPrice),
        Number(booking.paidAmount),
        booking.checkIn,
        requestCreatedAt,
        booking.rooms.length,
      );
      refundAmount = result.refundAmount;
      deductionAmount = result.deductionAmount;
    }

    await Promise.all(
      booking.rooms.map((rob) =>
        this.prismaService.room.update({
          where: { id: rob.room.id },
          data: { isBooked: false },
        }),
      ),
    );

    if (refundAmount > 0) {
      await this.createRefundVoucher(
        bookingId,
        BookingType.ROOM,
        booking.Membership_No,
        refundAmount,
        `Refund for room booking #${bookingId} cancellation. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
      );
    } else {
      const amountOwed = Math.max(0, deductionAmount - Number(booking.paidAmount));
      if (amountOwed > 0) {
        await this.createToBillVoucher(
          bookingId,
          BookingType.ROOM,
          booking.Membership_No,
          amountOwed,
          `Cancellation charges for room booking #${bookingId}. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
        );

        // Update member balance
        await this.prismaService.member.update({
          where: { Membership_No: booking.Membership_No },
          data: {
            Balance: { increment: amountOwed },
            drAmount: { increment: amountOwed },
          },
        });
      }
    }

    return await this.prismaService.roomBooking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        refundAmount: refundAmount,
      },
    });
  }

  private async cancelHallBookingInternal(bookingId: number, requestCreatedAt?: Date) {
    const booking = await this.prismaService.hallBooking.findUnique({
      where: { id: bookingId },
      include: { member: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    let refundAmount = 0;
    let deductionAmount = 0;

    if (requestCreatedAt) {
      const result = this.calculateRefund(
        'HALL',
        Number(booking.totalPrice),
        Number(booking.paidAmount),
        booking.bookingDate,
        requestCreatedAt,
      );
      refundAmount = result.refundAmount;
      deductionAmount = result.deductionAmount;
    }

    if (refundAmount > 0) {
      await this.createRefundVoucher(
        bookingId,
        BookingType.HALL,
        booking.member.Membership_No,
        refundAmount,
        `Refund for hall booking #${bookingId} cancellation. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
      );
    } else {
      const amountOwed = Math.max(0, deductionAmount - Number(booking.paidAmount));
      if (amountOwed > 0) {
        await this.createToBillVoucher(
          bookingId,
          BookingType.HALL,
          booking.member.Membership_No,
          amountOwed,
          `Cancellation charges for hall booking #${bookingId}. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
        );

        // Update member balance
        await this.prismaService.member.update({
          where: { Membership_No: booking.member.Membership_No },
          data: {
            Balance: { increment: amountOwed },
            drAmount: { increment: amountOwed },
          },
        });
      }
    }

    return await this.prismaService.hallBooking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        refundAmount: refundAmount,
      },
    });
  }

  private async cancelLawnBookingInternal(bookingId: number, requestCreatedAt?: Date) {
    const booking = await this.prismaService.lawnBooking.findUnique({
      where: { id: bookingId },
      include: { member: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Free lawn holdings if any
    await this.prismaService.lawnHoldings.deleteMany({
      where: { lawnId: booking.lawnId, holdBy: booking.memberId.toString() }, // holdBy is String, memberId is Int
    });

    let refundAmount = 0;
    let deductionAmount = 0;

    if (requestCreatedAt) {
      const result = this.calculateRefund(
        'LAWN',
        Number(booking.totalPrice),
        Number(booking.paidAmount),
        booking.bookingDate,
        requestCreatedAt,
      );
      refundAmount = result.refundAmount;
      deductionAmount = result.deductionAmount;
    }

    if (refundAmount > 0) {
      await this.createRefundVoucher(
        bookingId,
        BookingType.LAWN,
        booking.member.Membership_No,
        refundAmount,
        `Refund for lawn booking #${bookingId} cancellation. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
      );
    } else {
      const amountOwed = Math.max(0, deductionAmount - Number(booking.paidAmount));
      if (amountOwed > 0) {
        await this.createToBillVoucher(
          bookingId,
          BookingType.LAWN,
          booking.member.Membership_No,
          amountOwed,
          `Cancellation charges for lawn booking #${bookingId}. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
        );

        // Update member balance
        await this.prismaService.member.update({
          where: { Membership_No: booking.member.Membership_No },
          data: {
            Balance: { increment: amountOwed },
            drAmount: { increment: amountOwed },
          },
        });
      }
    }

    return await this.prismaService.lawnBooking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        refundAmount: refundAmount,
      },
    });
  }

  private async cancelPhotoshootBookingInternal(bookingId: number, requestCreatedAt?: Date) {
    const booking = await this.prismaService.photoshootBooking.findUnique({
      where: { id: bookingId },
      include: { member: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    let refundAmount = 0;
    let deductionAmount = 0;

    if (requestCreatedAt) {
      const result = this.calculateRefund(
        'PHOTOSHOOT',
        Number(booking.totalPrice),
        Number(booking.paidAmount),
        booking.bookingDate,
        requestCreatedAt,
      );
      refundAmount = result.refundAmount;
      deductionAmount = result.deductionAmount;
    }

    if (refundAmount > 0) {
      await this.createRefundVoucher(
        bookingId,
        BookingType.PHOTOSHOOT,
        booking.member.Membership_No,
        refundAmount,
        `Refund for photoshoot booking #${bookingId} cancellation. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
      );
    } else {
      const amountOwed = Math.max(0, deductionAmount - Number(booking.paidAmount));
      if (amountOwed > 0) {
        await this.createToBillVoucher(
          bookingId,
          BookingType.PHOTOSHOOT,
          booking.member.Membership_No,
          amountOwed,
          `Cancellation charges for photoshoot booking #${bookingId}. Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Deduction: ${deductionAmount}`,
        );

        // Update member balance
        await this.prismaService.member.update({
          where: { Membership_No: booking.member.Membership_No },
          data: {
            Balance: { increment: amountOwed },
            drAmount: { increment: amountOwed },
          },
        });
      }
    }

    return await this.prismaService.photoshootBooking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        refundAmount: refundAmount,
      },
    });
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  // hall bookings
  async gBookingsHall(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          none: { status: 'PENDING' }
        }
      },
      orderBy: {
        bookingDate: 'desc',
      },
      include: {
        cancellationRequests: true,
        hall: {
          select: {
            name: true,
            outOfOrders: {
              orderBy: {
                startDate: 'asc',
              },
            },
          },
        },
        member: {
          select: {
            Sno: true,
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    return await this.prismaService.hallBooking.findMany(args);
  }

  async cBookingHall(payload: BookingDto, createdBy: string) {
    const {
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      eventType,
      numberOfGuests,
      endDate: endDateInput,
      eventTime,
      paidBy,
      guestName,
      guestContact,
      remarks,
      reservationId,
      card_number,
      check_number,
      bank_name,
    } = payload;

    // ── VALIDATION ───────────────────────────────────────────
    if (!membershipNo || !entityId || !bookingDate || !eventType || !eventTime)
      throw new BadRequestException('Required fields missing');

    const booking = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking < today)
      throw new UnprocessableEntityException('Booking date cannot be in past');

    // Resolve End Date
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    // Ensure endDate is at least bookingDate
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    // Calculate number of days for DB (inclusive)
    // Add 1 hour to handle DST potential issues when dividing by 24h, verifying with rounding
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── BOOKING DETAILS NORMALIZATION ──
    const bookingDetails = payload.bookingDetails || [];
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];

    if (bookingDetails && bookingDetails.length > 0) {
      // Use provided details
      for (const detail of bookingDetails) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType || eventType,
        });
      }
    } else {
      // Fallback: Generate for each day in range using the single eventTime
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: currentCheckDate,
          timeSlot: payload.eventTime || 'EVENING',
          eventType: eventType,
        });
      }
    }

    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new BadRequestException('Member not found');

    // ── DELETE RESERVATION IF PROVIDED ──────────────────────
    if (reservationId) {
      await this.prismaService.hallReservation.deleteMany({
        where: { id: Number(reservationId) },
      });
    }

    // ── PROCESS IN TRANSACTION ───────────────────────────────
    return await this.prismaService.$transaction(async (prisma) => {
      const hall = await prisma.hall.findFirst({
        where: { id: Number(entityId) },
        include: { outOfOrders: true },
      });
      if (!hall) throw new BadRequestException('Hall not found');

      // ── TIME VALIDATION ────────────────────────────────────
      const normalizedEventTime = eventTime.toUpperCase() as
        | 'MORNING'
        | 'EVENING'
        | 'NIGHT';
      if (!['MORNING', 'EVENING', 'NIGHT'].includes(normalizedEventTime))
        throw new BadRequestException('Invalid event time');

      // ── CONFLICT CHECKS ────────────────────────────────────
      // ── CONFLICT CHECKS (Granular) ─────────────────────────
      for (const detail of normalizedDetails) {
        const currentCheckDate = detail.date;
        const currentSlot = detail.timeSlot; // e.g. "MORNING"

        // 1. Check Out of Order for this specific date
        const outOfOrderConflict = hall.outOfOrders?.find((period) => {
          const pStart = new Date(period.startDate).setHours(0, 0, 0, 0);
          const pEnd = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= pStart &&
            currentCheckDate.getTime() <= pEnd
          );
        });

        if (outOfOrderConflict) {
          throw new ConflictException(
            `Hall '${hall.name}' out of order on ${currentCheckDate.toDateString()}`,
          );
        }

        // 2. Check Existing Bookings (Robust Loop)
        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingBookings = await prisma.hallBooking.findMany({
          where: {
            hallId: hall.id,
            bookingDate: { lte: dayEnd },
            endDate: { gte: dayStart },
            isCancelled: false,
          },
        });

        for (const existingBooking of existingBookings) {
          const details = existingBooking.bookingDetails as any[];
          let hasConflict = false;

          if (details && Array.isArray(details) && details.length > 0) {
            // Check if existing booking has THIS slot on THIS date
            const conflictDetail = details.find((d: any) => {
              const dDate = new Date(d.date);
              // Compare using local date string (YYYY-MM-DD)
              return (
                dDate.toLocaleDateString('en-PK') ===
                currentCheckDate.toLocaleDateString('en-PK') &&
                d.timeSlot?.toUpperCase() === currentSlot?.toUpperCase()
              );
            });
            if (conflictDetail) hasConflict = true;
          } else {
            // Legacy/Fallback: blocks its `bookingTime`
            if (
              existingBooking.bookingTime?.toUpperCase() ===
              currentSlot?.toUpperCase()
            ) {
              hasConflict = true;
            }
          }

          if (hasConflict) {
            throw new ConflictException(
              `Hall already booked for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }
        }

        // 3. Check Reservations (Inclusive of the day)

        // Fetch all reservations for the day range, then filter by timeslot case-insensitively
        const possibleReservations = await prisma.hallReservation.findMany({
          where: {
            hallId: hall.id,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });

        const reservation = possibleReservations.find(
          (res) => res.timeSlot?.toUpperCase() === currentSlot?.toUpperCase(),
        );

        if (reservation) {
          throw new ConflictException(
            `Hall reserved for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }

        // 4. Check Holdings (Granular)
        const holding = await prisma.hallHoldings.findFirst({
          where: {
            hallId: hall.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() }, // Don't block self
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              {
                // Fallback for legacy holds (only expiry)
                fromDate: null,
              },
            ],
          },
        });

        if (holding) {
          throw new ConflictException(
            `Hall is currently on hold for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }
      }

      // ── PAYMENT CALCULATION ────────────────────────────────
      const basePrice =
        pricingType === 'member' ? hall.chargesMembers : hall.chargesGuests;
      const total = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * numberOfDays;
      let paid = 0,
        owed = total;

      if ((paymentStatus as unknown as PaymentStatus) === 'PAID') {
        paid = total;
        owed = 0;
      } else if (
        (paymentStatus as unknown as PaymentStatus) === 'HALF_PAID' ||
        (paymentStatus as unknown as PaymentStatus) === 'ADVANCE_PAYMENT'
      ) {
        paid = Number(paidAmount) || 0;
        owed = total - paid;
      } else if ((paymentStatus as unknown as PaymentStatus) === 'TO_BILL') {
        paid = Number(paidAmount) || 0;
        owed = total - paid;
      }

      const isToBill =
        (paymentStatus as unknown as PaymentStatus) === 'TO_BILL';
      const finalOwed = isToBill ? 0 : owed;
      const amountToBalance = isToBill ? owed : 0;

      // ── CREATE BOOKING ─────────────────────────────────────
      const booked = await prisma.hallBooking.create({
        data: {
          memberId: member.Sno,
          hallId: hall.id,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          bookingDetails: normalizedDetails,
          totalPrice: total,
          paymentStatus: paymentStatus as any,
          pricingType,
          numberOfGuests: Number(numberOfGuests!),
          paidAmount: paid,
          pendingAmount: finalOwed,
          eventType,
          bookingTime: normalizedEventTime,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          remarks: remarks!,
          createdBy,
          updatedBy: '-',
        },
      });

      // ── UPDATE HALL STATUS ─────────────────────────────────
      if (
        booking.getTime() <= today.getTime() &&
        endDate.getTime() >= today.getTime()
      ) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: { isBooked: true },
        });
      }

      // ── UPDATE MEMBER LEDGER ───────────────────────────────
      await prisma.member.update({
        where: { Membership_No: membershipNo },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: new Date(),
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(finalOwed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(finalOwed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // ── CREATE PAYMENT VOUCHER ─────────────────────────────
      if (paid > 0) {
        let voucherType: VoucherType = VoucherType.HALF_PAYMENT;
        if ((paymentStatus as unknown as PaymentStatus) === 'PAID') {
          voucherType = VoucherType.FULL_PAYMENT;
        } else if ((paymentStatus as unknown as PaymentStatus) === 'ADVANCE_PAYMENT') {
          voucherType = VoucherType.ADVANCE_PAYMENT;
        }

        const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';
        const vStatus = isOnline ? VoucherStatus.PENDING : VoucherStatus.CONFIRMED;
        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'HALL',
            booking_id: booked.id,
            membership_no: membershipNo,
            amount: paid,
            payment_mode: paymentMode as any,
            voucher_type: voucherType,
            status: vStatus,
            issued_by: 'admin',
            paid_at: vStatus === VoucherStatus.CONFIRMED ? new Date() : null,
            expiresAt: isOnline ? new Date(Date.now() + 60 * 60 * 1000) : null,
            remarks: this.formatHallBookingRemarks(
              hall.name,
              booking,
              endDate,
              eventType,
              normalizedDetails,
              normalizedEventTime,
            ),
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }

      // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
      await prisma.hallHoldings.deleteMany({
        where: { hallId: hall.id, holdBy: membershipNo.toString() },
      });

      return booked;
    });
  }

  async uBookingHall(payload: Partial<BookingDto>, updatedBy: string) {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      eventType,
      eventTime,
      endDate: endDateInput,
      numberOfGuests,
      paidBy,
      guestName,
      guestContact,
      remarks,
      card_number,
      check_number,
      bank_name,
    } = payload;

    if (
      !id ||
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !eventType ||
      !eventTime
    )
      throw new BadRequestException('Required fields missing');

    const booking = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Resolve End Date
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── BOOKING DETAILS NORMALIZATION ──
    const bookingDetailsIn = payload.bookingDetails || [];
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];

    if (bookingDetailsIn && bookingDetailsIn.length > 0) {
      for (const detail of bookingDetailsIn) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType || eventType,
        });
      }
    } else {
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: currentCheckDate,
          timeSlot: eventTime,
          eventType: eventType,
        });
      }
    }

    const existing = await this.prismaService.hallBooking.findUnique({
      where: { id: Number(id) },
      include: { hall: { include: { outOfOrders: true } }, member: true },
    });
    if (!existing) throw new NotFoundException('Booking not found');

    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new BadRequestException('Member not found');

    // ── PROCESS IN TRANSACTION ───────────────────────────────
    return await this.prismaService.$transaction(async (prisma) => {
      const hall = await prisma.hall.findFirst({
        where: { id: Number(entityId) },
        include: { outOfOrders: true },
      });
      if (!hall) throw new BadRequestException('Hall not found');

      // ── TIME VALIDATION ────────────────────────────────────
      const normalizedEventTime = eventTime.toUpperCase() as
        | 'MORNING'
        | 'EVENING'
        | 'NIGHT';
      if (!['MORNING', 'EVENING', 'NIGHT'].includes(normalizedEventTime))
        throw new BadRequestException('Invalid event time');

      // Check for conflicts only if details changed
      const detailsChanged =
        existing.hallId !== Number(entityId) ||
        existing.bookingDate.getTime() !== booking.getTime() ||
        existing.endDate.getTime() !== endDate.getTime() || // Check endDate change
        existing.bookingTime !== normalizedEventTime ||
        JSON.stringify(existing.bookingDetails) !==
        JSON.stringify(normalizedDetails);

      if (detailsChanged) {
        // Granular check for each date/slot
        for (const detail of normalizedDetails) {
          const currentCheckDate = detail.date;
          const currentSlot = detail.timeSlot;

          // existingBooking conflict check
          const dayStart = new Date(currentCheckDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentCheckDate);
          dayEnd.setHours(23, 59, 59, 999);

          const conflictingBookings = await prisma.hallBooking.findMany({
            where: {
              hallId: Number(entityId),
              id: { not: Number(id) },
              bookingDate: { lte: dayEnd },
              endDate: { gte: dayStart },
              isCancelled: false,
            },
          });

          for (const conflictingBooking of conflictingBookings) {
            const cDetails = conflictingBooking.bookingDetails as any[];
            let hasConflict = false;
            if (cDetails && Array.isArray(cDetails) && cDetails.length > 0) {
              const conflict = cDetails.find((d: any) => {
                const dDate = new Date(d.date);
                return (
                  dDate.toLocaleDateString('en-CA') ===
                  currentCheckDate.toLocaleDateString('en-CA') &&
                  d.timeSlot?.toUpperCase() === currentSlot?.toUpperCase()
                );
              });
              if (conflict) hasConflict = true;
            } else {
              if (
                conflictingBooking.bookingTime?.toUpperCase() ===
                currentSlot?.toUpperCase()
              )
                hasConflict = true;
            }

            if (hasConflict) {
              throw new ConflictException(
                `Hall already booked for ${currentSlot} on ${currentCheckDate.toDateString()}`,
              );
            }
          }

          // Reservation conflict check (Inclusive of the day)

          // Fetch all reservations then filter case-insensitively
          const possibleReservations = await prisma.hallReservation.findMany({
            where: {
              hallId: Number(entityId),
              reservedFrom: { lte: dayEnd },
              reservedTo: { gte: dayStart },
            },
          });

          const conflictingReservation = possibleReservations.find(
            (res) => res.timeSlot?.toUpperCase() === currentSlot?.toUpperCase(),
          );

          if (conflictingReservation) {
            throw new ConflictException(
              `Hall reserved for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }

          // 3. Hall Holding conflict check (Granular)
          const conflictingHolding = await prisma.hallHoldings.findFirst({
            where: {
              hallId: Number(entityId),
              onHold: true,
              holdExpiry: { gt: new Date() },
              NOT: { holdBy: membershipNo }, // Exclude holds by this member
              OR: [
                {
                  fromDate: { lte: currentCheckDate },
                  toDate: { gte: currentCheckDate },
                  timeSlot: currentSlot,
                },
                {
                  fromDate: null,
                },
              ],
            },
          });

          if (conflictingHolding) {
            throw new ConflictException(
              `Hall is currently on hold for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }
        }
      }

      // ── PAYMENT RECALCULATION ──────────────────────────────

      // ── PAYMENT CALCULATIONS ────────────────────────────────
      const currTotal = Number(existing.totalPrice);
      const currPaid = Number(existing.paidAmount);
      const currStatus = existing.paymentStatus as unknown as PaymentStatus;

      const newTotal = Number(totalPrice);
      let newPaymentStatus =
        (paymentStatus as unknown as PaymentStatus) || currStatus;

      const isPriceIncrease = newTotal > currPaid;
      const isExplicitStatusChange = paymentStatus !== undefined;
      const isExplicitPaidAmount = paidAmount !== undefined;

      let newPaid = currPaid;

      if (
        isPriceIncrease &&
        !isExplicitStatusChange &&
        !isExplicitPaidAmount &&
        currStatus === (PaymentStatus.PAID as unknown)
      ) {
        // Auto downgrade
        newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
        newPaid = currPaid;
      } else {
        if (newPaymentStatus === PaymentStatus.PAID) {
          newPaid = newTotal;
        } else if (newPaymentStatus === PaymentStatus.UNPAID) {
          newPaid = 0;
        } else if (
          newPaymentStatus === (PaymentStatus.HALF_PAID as unknown) ||
          newPaymentStatus === 'HALF_PAID' ||
          newPaymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) ||
          newPaymentStatus === 'ADVANCE_PAYMENT'
        ) {
          newPaid = isExplicitPaidAmount ? Number(paidAmount) : currPaid;
        } else if (
          newPaymentStatus === (PaymentStatus.TO_BILL as unknown) ||
          newPaymentStatus === 'TO_BILL'
        ) {
          newPaid = isExplicitPaidAmount ? Number(paidAmount) : currPaid;
        }
      }

      // NEW LOGIC: Only stagnate db ledger (paidAmount) if the increase is ONLINE
      let dbPaid = newPaid;
      const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';

      if (isOnline && newPaid > currPaid) {
        dbPaid = currPaid;
      }

      let newOwed = newTotal - dbPaid;
      let amountToBalance = 0;
      if (newPaymentStatus === PaymentStatus.TO_BILL) {
        amountToBalance = newOwed;
        newOwed = 0;
      }

      const refundAmount = await this.handleVoucherUpdateUnified(
        Number(id),
        'HALL',
        membershipNo,
        newTotal,
        newPaid,
        newPaymentStatus,
        currTotal,
        currPaid,
        currStatus,
        {
          hallName: hall.name,
          bookingDate: booking,
          endDate: endDate,
          eventTime: normalizedEventTime,
          eventType: eventType,
          bookingDetails: normalizedDetails,
          remarks: remarks,
        },
        (paymentMode as unknown as PaymentMode) || PaymentMode.CASH,
        'admin',
        updatedBy,
        card_number,
        check_number,
        bank_name,
      );

      const paidDiff = dbPaid - currPaid;
      const owedDiff = newOwed - (currTotal - currPaid);

      // ── UPDATE BOOKING ─────────────────────────────────────
      const updated = await prisma.hallBooking.update({
        where: { id: Number(id) },
        data: {
          hallId: hall.id,
          memberId: member.Sno,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          bookingDetails: normalizedDetails,
          totalPrice: newTotal,
          paymentStatus: newPaymentStatus,
          pricingType,
          paidAmount: newPaid,
          pendingAmount: newOwed,
          numberOfGuests: Number(numberOfGuests!),
          eventType,
          bookingTime: normalizedEventTime,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          refundAmount,
          refundReturned: false,
          updatedBy,
        } as any,
      });

      // ── UPDATE VOUCHER DATES ───────────────────────────────
      const dateChanged = existing.bookingDate.getTime() !== booking.getTime();
      if (
        dateChanged &&
        (newPaymentStatus === 'PAID' || newPaymentStatus === 'HALF_PAID')
      ) {
        await prisma.paymentVoucher.updateMany({
          where: {
            booking_id: Number(id),
            booking_type: 'HALL',
            status: VoucherStatus.CONFIRMED,
            voucher_type: {
              in: [VoucherType.FULL_PAYMENT, VoucherType.HALF_PAYMENT],
            },
          },
          data: {
            remarks: this.formatHallBookingRemarks(
              existing.hall.name,
              booking,
              endDate,
              eventType,
              normalizedDetails,
              normalizedEventTime,
            ),
          },
        });
      }

      // ── UPDATE HALL STATUS ─────────────────────────────────
      // We need to re-evaluate isBooked based on current date
      // If current date is within the range, isBooked = true
      const now = new Date().getTime();
      const isWithinRange =
        now >= booking.getTime() && now <= endDate.getTime();
      const wasWithinRange =
        now >= existing.bookingDate.getTime() &&
        now <= existing.endDate.getTime();

      // Simple update: Check if ANY booking is currently active for this hall, if so set True, else False
      // But that's expensive to query all.
      // Optimistic approach: if we just added a current booking, set true.
      if (isWithinRange && !wasWithinRange) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: { isBooked: true },
        });
      }
      // If we removed a current booking (moved dates), we should check if others exist?
      // Or just set false if we think we were the only one? Safer to leave as is or do a check if critical.
      // Given existing logic was simple toggle, we'll stick to simple logic:
      // If we are active NOW, ensure encoded.
      if (isWithinRange) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: { isBooked: true },
        });
      }

      // ── UPDATE MEMBER LEDGER ───────────────────────────────
      if (paidDiff !== 0 || owedDiff !== 0) {
        await prisma.member.update({
          where: { Membership_No: membershipNo },
          data: {
            bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
            bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
            bookingBalance: {
              increment: Math.round(Number(paidDiff) - Number(owedDiff)),
            },
            lastBookingDate: new Date(),
            Balance: { increment: Math.round(amountToBalance) },
            drAmount: { increment: Math.round(amountToBalance) },
          },
        });
      }

      // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
      // For updates, we clear existing holds for this member/hall
      await prisma.hallHoldings.deleteMany({
        where: {
          hallId: hall.id,
          holdBy: existing.member.Membership_No,
        },
      });

      return updated;
    });
  }

  // member hall booking
  async cBookingHallMember(payload: any, createdBy: string = 'member') {
    const {
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus = 'PAID',
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      eventType,
      eventTime,
      endDate: endDateInput,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      card_number,
      check_number,
      bank_name,
    } = payload;

    // ── VALIDATION ───────────────────────────────────────────
    if (!membershipNo || !entityId || !bookingDate || !eventType || !eventTime)
      throw new BadRequestException('Required fields missing');

    const booking = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking < today)
      throw new ConflictException('Booking date cannot be in past');

    // Resolve End Date
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── BOOKING DETAILS NORMALIZATION ──
    const bookingDetailsIn = payload.bookingDetails || [];
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];

    const normalizedEventTime = eventTime.toUpperCase() as
      | 'MORNING'
      | 'EVENING'
      | 'NIGHT';
    if (!['MORNING', 'EVENING', 'NIGHT'].includes(normalizedEventTime))
      throw new BadRequestException('Invalid event time');

    if (bookingDetailsIn && bookingDetailsIn.length > 0) {
      for (const detail of bookingDetailsIn) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType || eventType,
        });
      }
    } else {
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: currentCheckDate,
          timeSlot: normalizedEventTime,
          eventType: eventType,
        });
      }
    }

    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });
    if (!member) throw new NotFoundException('Member not found');

    // ── PROCESS IN TRANSACTION ───────────────────────────────
    return await this.prismaService.$transaction(async (prisma) => {
      const hall = await prisma.hall.findFirst({
        where: { id: Number(entityId) },
        include: { outOfOrders: true },
      });
      if (!hall) throw new NotFoundException('Hall not found');

      // (Replaced below with granular check)
      // Check holdings
      // const hallHold: any = await prisma.hallHoldings.findFirst({ ... });
      // if (hallHold) throw new ConflictException('Hall is currently on hold');

      // ── CONFLICT CHECKS (Granular) ─────────────────────────
      for (const detail of normalizedDetails) {
        const currentCheckDate = detail.date;
        const currentSlot = detail.timeSlot;

        // 1. Check Out of Order
        const outOfOrderConflict = hall.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict) {
          throw new ConflictException(
            `Hall '${hall.name}' out of order on ${currentCheckDate.toDateString()}`,
          );
        }

        // 2. Check Existing Bookings (Robust Loop)
        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingBookings = await prisma.hallBooking.findMany({
          where: {
            hallId: hall.id,
            bookingDate: { lte: dayEnd },
            endDate: { gte: dayStart },
            isCancelled: false,
          },
        });

        for (const existingBooking of existingBookings) {
          const details = existingBooking.bookingDetails as any[];
          let hasConflict = false;
          if (details && Array.isArray(details) && details.length > 0) {
            const conflict = details.find((d: any) => {
              const dDate = new Date(d.date);
              return (
                dDate.toLocaleDateString('en-CA') ===
                currentCheckDate.toLocaleDateString('en-CA') &&
                d.timeSlot?.toUpperCase() === currentSlot?.toUpperCase()
              );
            });
            if (conflict) hasConflict = true;
          } else {
            if (
              existingBooking.bookingTime?.toUpperCase() ===
              currentSlot?.toUpperCase()
            )
              hasConflict = true;
          }

          if (hasConflict) {
            throw new ConflictException(
              `Hall already booked for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }
        }

        // 3. Check Reservations (Inclusive of the day, case-insensitive)
        const possibleReservations = await prisma.hallReservation.findMany({
          where: {
            hallId: hall.id,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });

        const conflictingReservation = possibleReservations.find(
          (res) => res.timeSlot?.toUpperCase() === currentSlot?.toUpperCase(),
        );

        if (conflictingReservation) {
          throw new ConflictException(
            `Hall reserved for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }

        // 4. Check Holdings (Granular)
        const holding = await prisma.hallHoldings.findFirst({
          where: {
            hallId: hall.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              {
                fromDate: null,
              },
            ],
          },
        });

        if (holding) {
          throw new ConflictException(
            `Hall is currently on hold for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }
      }

      // ── PAYMENT CALCULATION ────────────────────────────────
      const basePrice =
        pricingType === 'member' ? hall.chargesMembers : hall.chargesGuests;
      const total = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * numberOfDays;
      let paid = 0,
        owed = total;

      let amountToBalance = 0;
      const isToBill = paymentStatus === 'TO_BILL';

      if (paymentStatus === 'PAID') {
        paid = total;
        owed = 0;
      } else if (paymentStatus === 'HALF_PAID') {
        paid = Number(paidAmount) || 0;
        if (paid <= 0 || paid >= total)
          throw new ConflictException(
            'For half-paid: paid amount must be >0 and <total',
          );
        owed = total - paid;
      }

      if (isToBill) {
        amountToBalance = owed;
        owed = 0;
      }

      // ── CREATE BOOKING ─────────────────────────────────────
      const booked = await prisma.hallBooking.create({
        data: {
          memberId: member.Sno,
          hallId: hall.id,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          bookingDetails: normalizedDetails,
          totalPrice: total,
          paymentStatus: paymentStatus,
          pricingType,
          paidAmount: paid,
          pendingAmount: owed,
          eventType,
          bookingTime: normalizedEventTime,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          createdBy,
          updatedBy: '-',
        },
        include: { hall: { select: { name: true, capacity: true } } },
      });

      // ── CREATE HALL HOLDINGS (Mirrors Booking) ─────────────
      await prisma.hallHoldings.createMany({
        data: normalizedDetails.map((detail) => ({
          hallId: hall.id,
          onHold: true,
          fromDate: detail.date,
          toDate: detail.date,
          timeSlot: detail.timeSlot,
          holdExpiry: endDate,
          holdBy: membershipNo.toString(),
        })),
      });

      // ── UPDATE HALL STATUS ─────────────────────────────────
      if (
        booking.getTime() <= today.getTime() &&
        endDate.getTime() >= today.getTime()
      ) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: {
            isBooked: true,
          },
        });
      }

      // ── UPDATE MEMBER LEDGER ───────────────────────────────
      await prisma.member.update({
        where: { Membership_No: membershipNo.toString() },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: new Date(),
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(owed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(owed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // ── CREATE PAYMENT VOUCHER ─────────────────────────────
      if (paid > 0) {
        const voucherType =
          paymentStatus === 'PAID'
            ? VoucherType.FULL_PAYMENT
            : VoucherType.HALF_PAYMENT;
        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'HALL',
            booking_id: booked.id,
            membership_no: membershipNo.toString(),
            amount: paid,
            payment_mode: paymentMode as unknown as PaymentMode,
            voucher_type: voucherType,
            status: VoucherStatus.CONFIRMED,
            issued_by: 'member',
            remarks:
              this.formatHallBookingRemarks(
                hall.name,
                booking,
                endDate,
                eventType,
                normalizedDetails,
                normalizedEventTime,
              ) + (specialRequests ? ` | ${specialRequests}` : ''),
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }

      return {
        success: true,
        message: `Booked ${hall.name}`,
        booking: booked,
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: owed,
      };
    });
  }

  async uBookingHallMember(payload: any, updatedBy: string = 'member') {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      eventType,
      numberOfGuests,
      eventTime,
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      remarks,
      endDate: endDateInput,
      bookingDetails: bookingDetailsIn,
    } = payload;

    if (
      !id ||
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !eventType ||
      !eventTime
    )
      throw new BadRequestException('Required fields missing');

    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);

    const existing = await this.prismaService.hallBooking.findUnique({
      where: { id: Number(id) },
      include: { hall: { include: { outOfOrders: true } }, member: true },
    });
    if (!existing) throw new NotFoundException('Hall booking not found');

    // Resolve End Date
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── BOOKING DETAILS NORMALIZATION ──
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];
    const normalizedEventTime = eventTime.toUpperCase() as
      | 'MORNING'
      | 'EVENING'
      | 'NIGHT';
    if (!['MORNING', 'EVENING', 'NIGHT'].includes(normalizedEventTime))
      throw new BadRequestException('Invalid event time');

    if (bookingDetailsIn && bookingDetailsIn.length > 0) {
      for (const detail of bookingDetailsIn) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType || eventType,
        });
      }
    } else {
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: currentCheckDate,
          timeSlot: normalizedEventTime,
          eventType: eventType,
        });
      }
    }

    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new NotFoundException('Member not found');

    // ── PROCESS IN TRANSACTION ───────────────────────────────
    return await this.prismaService.$transaction(async (prisma) => {
      const hall = await prisma.hall.findFirst({
        where: { id: Number(entityId) },
        include: { outOfOrders: true },
      });
      if (!hall) throw new BadRequestException('Hall not found');

      // ── CONFLICT CHECKS (Granular & Inclusive) ────────────
      for (const detail of normalizedDetails) {
        const currentCheckDate = detail.date;
        const currentSlot = detail.timeSlot;

        // 1. Check Out of Order
        const outOfOrderConflict = hall.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict) {
          throw new ConflictException(
            `Hall '${hall.name}' out of order on ${currentCheckDate.toDateString()}`,
          );
        }

        // 2. Check Existing Bookings
        const confBooking = await prisma.hallBooking.findFirst({
          where: {
            hallId: hall.id,
            id: { not: Number(id) },
            bookingDate: { lte: currentCheckDate },
            endDate: { gte: currentCheckDate },
            isCancelled: false,
          },
        });

        if (confBooking) {
          const dArr = confBooking.bookingDetails as any[];
          let hasConflict = false;
          if (dArr && Array.isArray(dArr) && dArr.length > 0) {
            const conflictFound = dArr.find((d: any) => {
              const dDate = new Date(d.date);
              dDate.setHours(0, 0, 0, 0);
              return (
                dDate.getTime() === currentCheckDate.getTime() &&
                d.timeSlot === currentSlot
              );
            });
            if (conflictFound) hasConflict = true;
          } else {
            if (confBooking.bookingTime === currentSlot) hasConflict = true;
          }

          if (hasConflict) {
            throw new ConflictException(
              `Hall already booked for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }
        }

        // 3. Check Reservations (Inclusive of the day)
        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);

        const confReservation = await prisma.hallReservation.findFirst({
          where: {
            hallId: hall.id,
            timeSlot: currentSlot,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });

        if (confReservation) {
          throw new ConflictException(
            `Hall reserved for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }

        // 4. Check Holdings (Granular)
        const holding = await prisma.hallHoldings.findFirst({
          where: {
            hallId: hall.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              {
                fromDate: null,
              },
            ],
          },
        });

        if (holding) {
          throw new ConflictException(
            `Hall is currently on hold for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );
        }
      }

      // ── PAYMENT CALCULATIONS ────────────────────────────────
      const currTotal = Number(existing.totalPrice);
      const currPaid = Number(existing.paidAmount);
      const currStatus = existing.paymentStatus as unknown as PaymentStatus;

      const basePrice =
        pricingType === 'member' ? hall.chargesMembers : hall.chargesGuests;
      const newTotal = totalPrice ? Number(totalPrice) : Number(basePrice);
      let newPaymentStatus =
        (paymentStatus as unknown as PaymentStatus) || currStatus;

      const isPriceIncrease = newTotal > currPaid;
      const isExplicitPayment = paidAmount !== undefined;
      const isStatusUnchanged =
        !paymentStatus ||
        (paymentStatus as unknown as PaymentStatus) === currStatus;

      let newPaid = currPaid;

      if (
        isPriceIncrease &&
        !isExplicitPayment &&
        isStatusUnchanged &&
        currStatus === (PaymentStatus.PAID as unknown)
      ) {
        newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
        newPaid = currPaid;
      } else {
        if (newPaymentStatus === PaymentStatus.PAID) {
          newPaid = newTotal;
        } else if (newPaymentStatus === PaymentStatus.UNPAID) {
          newPaid = 0;
        } else {
          newPaid = paidAmount !== undefined ? Number(paidAmount) : currPaid;
        }
      }

      let newOwed = newTotal - newPaid;

      // Handle TO_BILL adjustment
      let amountToBalance = 0;
      if (newPaymentStatus === PaymentStatus.TO_BILL) {
        amountToBalance = newOwed;
        newOwed = 0;
      }

      const refundAmount = await this.handleVoucherUpdateUnified(
        Number(id),
        'HALL',
        membershipNo,
        newTotal,
        newPaid,
        newPaymentStatus,
        currTotal,
        currPaid,
        currStatus,
        {
          hallName: hall.name,
          bookingDate: booking,
          endDate: endDate,
          eventTime: normalizedEventTime,
          eventType: eventType,
          bookingDetails: normalizedDetails,
          remarks: remarks,
        },
        (paymentMode as unknown as PaymentMode) || PaymentMode.ONLINE,
        'member',
      );

      const paidDiff = newPaid - currPaid;
      const owedDiff = newOwed - (currTotal - currPaid);

      // ── CREATE/UPDATE HALL HOLDINGS ───────────────────────
      await prisma.hallHoldings.deleteMany({
        where: {
          hallId: hall.id,
          holdBy: existing.member.Membership_No,
        },
      });

      await prisma.hallHoldings.createMany({
        data: normalizedDetails.map((detail) => ({
          hallId: hall.id,
          onHold: true,
          fromDate: detail.date,
          toDate: detail.date,
          timeSlot: detail.timeSlot,
          holdExpiry: endDate,
          holdBy: membershipNo.toString(),
        })),
      });

      const updated = await prisma.hallBooking.update({
        where: { id: Number(id) },
        data: {
          hallId: hall.id,
          memberId: member.Sno,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          bookingDetails: normalizedDetails,
          totalPrice: newTotal,
          paymentStatus: newPaymentStatus,
          pricingType,
          paidAmount: newPaid,
          pendingAmount: newOwed,
          numberOfGuests: Number(numberOfGuests),
          eventType,
          bookingTime: normalizedEventTime,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          refundAmount,
          refundReturned: false,
          updatedBy,
        } as any,
      });

      // ── UPDATE HALL STATUS ─────────────────────────────────
      const nowTs = new Date().getTime();
      const isWithinRange =
        nowTs >= booking.getTime() && nowTs <= endDate.getTime();
      const wasWithinRange =
        nowTs >= existing.bookingDate.getTime() &&
        nowTs <= (existing.endDate || existing.bookingDate).getTime();

      if (isWithinRange && !wasWithinRange) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: { isBooked: true },
        });
      } else if (wasWithinRange && !isWithinRange) {
        await prisma.hall.update({
          where: { id: hall.id },
          data: { isBooked: false },
        });
      }

      // ── UPDATE MEMBER LEDGER ───────────────────────────────
      if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
        await prisma.member.update({
          where: { Membership_No: membershipNo },
          data: {
            bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
            bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
            bookingBalance: {
              increment: Math.round(Number(paidDiff) - Number(owedDiff)),
            },
            lastBookingDate: new Date(),
            Balance: { increment: Math.round(amountToBalance) },
            drAmount: { increment: Math.round(amountToBalance) },
          },
        });
      }

      return {
        success: true,
        message: 'Hall booking updated',
        booking: updated,
        refundAmount,
      };
    });
  }

  async cCancellationRequestHall(bookingId: number, reason: string, requestedBy?: string) {
    const booking = await this.prismaService.hallBooking.findUnique({
      where: { id: bookingId },
      include: {
        cancellationRequests: {
          where: { OR: [{ status: 'PENDING' }, { status: 'APPROVED' }] }
        }
      }
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.cancellationRequests && booking.cancellationRequests.length > 0) {
      throw new BadRequestException('A cancellation request is already pending or approved for this booking');
    }

    return await this.prismaService.hallCancellationRequest.create({
      data: {
        bookingId: booking.id,
        reason: reason || 'Booking cancellation requested by admin',
        requestedBy: requestedBy || 'Admin',
        status: 'PENDING',
      },
    });
  }

  // lawn booking
  async gBookingsLawn(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          none: { status: 'PENDING' }
        }
      },
      orderBy: { bookingDate: 'desc' },
      include: {
        cancellationRequests: true,
        lawn: { include: { lawnCategory: true } },
        member: {
          select: { Membership_No: true, Name: true },
        },
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    return await this.prismaService.lawnBooking.findMany(args);
  }
  async cBookingLawn(payload: BookingDto, createdBy: string) {
    const {
      membershipNo,
      entityId,
      bookingDate,
      endDate: endDateInput,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      numberOfGuests,
      eventTime,
      paidBy,
      guestName,
      guestContact,
      eventType,
      bookingDetails,
      reservationId,
      card_number,
      check_number,
      bank_name,
    } = payload;

    if (
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !numberOfGuests ||
      !eventType
    )
      throw new BadRequestException('Required fields missing');

    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking < today)
      throw new UnprocessableEntityException('Booking date cannot be in past');

    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new BadRequestException('Member not found');

    const lawn = await this.prismaService.lawn.findFirst({
      where: { id: Number(entityId) },
      include: { outOfOrders: { orderBy: { startDate: 'asc' } } },
    });
    if (!lawn) throw new BadRequestException('Lawn not found');
    if (!lawn.isActive) throw new ConflictException('Lawn is not active');

    // ── DELETE RESERVATION IF PROVIDED ──────────────────────
    if (reservationId) {
      await this.prismaService.lawnReservation.deleteMany({
        where: { id: Number(reservationId) },
      });
    }

    const currentSlot = (eventTime as string) || 'NIGHT';

    return await this.prismaService.$transaction(async (prisma) => {
      // ── CONFLICT CHECKS ──
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);

        // 1. Out of Order
        const outOfOrderConflict = lawn.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict)
          throw new ConflictException(
            `Lawn out of order on ${currentCheckDate.toDateString()}`,
          );

        // 2. Existing Bookings
        const existingBookings = await prisma.lawnBooking.findMany({
          where: {
            lawnId: lawn.id,
            bookingDate: { lte: currentCheckDate },
            endDate: { gte: currentCheckDate },
            isCancelled: false, // Ignore cancelled bookings
          },
        });

        for (const existingBooking of existingBookings) {
          const details = existingBooking.bookingDetails as any[];
          let hasConflict = false;

          if (details && Array.isArray(details) && details.length > 0) {
            const conflictDetail = details.find((d: any) => {
              const dDate = new Date(d.date);
              dDate.setHours(0, 0, 0, 0);
              return (
                dDate.getTime() === currentCheckDate.getTime() &&
                d.timeSlot === currentSlot
              );
            });
            if (conflictDetail) hasConflict = true;
          } else {
            // Fallback: Check main bookingTime
            if (existingBooking.bookingTime === currentSlot) {
              hasConflict = true;
            }
          }

          if (hasConflict) {
            throw new ConflictException(
              `Lawn already booked for ${currentSlot} on ${currentCheckDate.toDateString()}`,
            );
          }
        }

        // 3. Reservations
        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);
        const reservation = await prisma.lawnReservation.findFirst({
          where: {
            lawnId: lawn.id,
            timeSlot: currentSlot,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });
        if (reservation)
          throw new ConflictException(
            `Lawn reserved for ${currentSlot} on ${currentCheckDate.toDateString()}`,
          );

        // 4. Holdings
        const holding = await prisma.lawnHoldings.findFirst({
          where: {
            lawnId: lawn.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              { fromDate: null },
            ],
          },
        });
        if (holding)
          throw new ConflictException(
            `Lawn is on hold on ${currentCheckDate.toDateString()}`,
          );
      }

      // ── CAPACITY CHECK ──
      if (numberOfGuests < (lawn.minGuests || 0))
        throw new ConflictException(
          `Guests (${numberOfGuests}) below minimum ${lawn.minGuests}`,
        );
      if (numberOfGuests > lawn.maxGuests)
        throw new ConflictException(
          `Guests (${numberOfGuests}) exceeds maximum ${lawn.maxGuests}`,
        );

      // ── PAYMENT ──
      const basePrice =
        pricingType === 'member' ? lawn.memberCharges : lawn.guestCharges;
      const slotsCount = (bookingDetails as any[])?.length || numberOfDays;
      const total = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * slotsCount;
      let paid = 0,
        owed = total;
      let amountToBalance = 0;
      const isToBill = (paymentStatus as unknown as string) === 'TO_BILL';

      if ((paymentStatus as unknown as PaymentStatus) === 'PAID') {
        paid = total;
        owed = 0;
      } else if (
        (paymentStatus as unknown as PaymentStatus) === 'HALF_PAID' ||
        (paymentStatus as unknown as PaymentStatus) === 'ADVANCE_PAYMENT'
      ) {
        paid = Number(paidAmount) || 0;
        owed = total - paid;
      }
      if (isToBill) {
        amountToBalance = owed;
        owed = 0;
      }

      // ── CREATE ──
      const booked = await prisma.lawnBooking.create({
        data: {
          memberId: member.Sno,
          lawnId: lawn.id,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          guestsCount: numberOfGuests,
          totalPrice: total,
          paymentStatus: paymentStatus as any,
          pricingType,
          paidAmount: paid,
          pendingAmount: owed,
          bookingTime: currentSlot as any,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          eventType,
          bookingDetails: bookingDetails || [],
          createdBy,
          updatedBy: '-',
        },
      });

      // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
      await prisma.lawnHoldings.deleteMany({
        where: { lawnId: lawn.id, holdBy: membershipNo.toString() },
      });

      // ── UPDATE LEDGER ──
      await prisma.member.update({
        where: { Membership_No: membershipNo },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: new Date(),
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(owed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(owed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // ── VOUCHER ──
      if (paid > 0) {
        // Construct remarks using helper if possible, or direct logic since 'this' might be accessible
        // Using 'this' in arrow function inside transaction might be tricky if context is lost,
        // but verify: this is class method, transaction callback is arrow function capturing 'this'.
        const remarks = this.formatLawnBookingRemarks(
          lawn.description || "",
          bookingDetails as any[],
          booking,
          currentSlot,
        );

        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'LAWN',
            booking_id: booked.id,
            membership_no: membershipNo,
            amount: paid,
            payment_mode: paymentMode as any,
            voucher_type:
              (paymentStatus as unknown as PaymentStatus) === 'PAID'
                ? VoucherType.FULL_PAYMENT
                : (paymentStatus as unknown as PaymentStatus) === 'ADVANCE_PAYMENT'
                  ? VoucherType.ADVANCE_PAYMENT
                  : VoucherType.HALF_PAYMENT,
            status: (paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE')
              ? VoucherStatus.PENDING
              : VoucherStatus.CONFIRMED,
            issued_by: 'admin',
            paid_at: (paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE')
              ? null
              : new Date(),
            expiresAt: (paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE')
              ? new Date(Date.now() + 60 * 60 * 1000)
              : null,
            remarks: `${remarks} | ${numberOfGuests} guests`,
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }

      return { ...booked, lawnName: lawn.description };
    });
  }

  async uBookingLawn(payload: Partial<BookingDto>, updatedBy: string) {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      endDate: endDateInput,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode = 'CASH',
      numberOfGuests,
      eventTime,
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      remarks,
      eventType,
      bookingDetails,
      card_number,
      check_number,
      bank_name,
    } = payload;

    if (
      !id ||
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !numberOfGuests ||
      !eventTime ||
      !eventType
    )
      throw new BadRequestException('Required fields missing');

    const existing = await this.prismaService.lawnBooking.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) throw new NotFoundException('Lawn booking not found');

    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new NotFoundException('Member not found');

    const lawn = await this.prismaService.lawn.findFirst({
      where: { id: Number(entityId) },
      include: { outOfOrders: true },
    });
    if (!lawn) throw new NotFoundException('Lawn not found');

    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const currentSlot = eventTime.toUpperCase();

    return await this.prismaService.$transaction(async (prisma) => {
      // ── CONFLICT CHECKS ──
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);

        const outOfOrderConflict = lawn.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict)
          throw new ConflictException('Lawn out of service');

        const existingBookings = await prisma.lawnBooking.findMany({
          where: {
            lawnId: lawn.id,
            id: { not: Number(id) },
            bookingDate: { lte: currentCheckDate },
            endDate: { gte: currentCheckDate },
            isCancelled: false,
          },
        });

        for (const existingBooking of existingBookings) {
          const details = existingBooking.bookingDetails as any[];
          let hasConflict = false;
          if (details && Array.isArray(details) && details.length > 0) {
            const conflictDetail = details.find((d: any) => {
              const dDate = new Date(d.date);
              dDate.setHours(0, 0, 0, 0);
              return (
                dDate.getTime() === currentCheckDate.getTime() &&
                d.timeSlot === currentSlot
              );
            });
            if (conflictDetail) hasConflict = true;
          } else {
            if (existingBooking.bookingTime === currentSlot) hasConflict = true;
          }
          if (hasConflict) throw new ConflictException('Lawn already booked');
        }

        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);
        const confReservation = await prisma.lawnReservation.findFirst({
          where: {
            lawnId: lawn.id,
            timeSlot: currentSlot,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });
        if (confReservation) throw new ConflictException('Lawn reserved');

        const holding = await prisma.lawnHoldings.findFirst({
          where: {
            lawnId: lawn.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              { fromDate: null },
            ],
          },
        });
        if (holding) throw new ConflictException('Lawn on hold');
      }

      // ── PAYMENT ──
      const currTotal = Number(existing.totalPrice);
      const currPaid = Number(existing.paidAmount);
      const currStatus = existing.paymentStatus as unknown as PaymentStatus;
      const basePrice =
        pricingType === 'member' ? lawn.memberCharges : lawn.guestCharges;
      const slotsCount = (bookingDetails as any[])?.length || numberOfDays;
      const newTotal = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * slotsCount;
      let newPaymentStatus =
        (paymentStatus as unknown as PaymentStatus) || currStatus;
      const isExplicitStatusChange = paymentStatus !== undefined;
      const isExplicitPaidAmount = paidAmount !== undefined;

      // Auto-downgrade status if price increases and was previously PAID
      if (
        !paymentStatus &&
        currStatus === (PaymentStatus.PAID as unknown) &&
        newTotal > currPaid
      ) {
        newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
      }
      let newPaid = currPaid;
      if (
        newPaymentStatus === (PaymentStatus.PAID as unknown) ||
        newPaymentStatus === 'PAID'
      ) {
        newPaid = newTotal;
      } else if (
        newPaymentStatus === (PaymentStatus.UNPAID as unknown) ||
        newPaymentStatus === 'UNPAID'
      ) {
        newPaid = 0;
      } else if (
        newPaymentStatus === (PaymentStatus.HALF_PAID as unknown) ||
        newPaymentStatus === 'HALF_PAID' ||
        newPaymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) ||
        newPaymentStatus === 'ADVANCE_PAYMENT'
      ) {
        newPaid = isExplicitPaidAmount ? Number(paidAmount) : currPaid;
      }

      // NEW LOGIC: Only stagnate db ledger (paidAmount) if the increase is ONLINE
      let dbPaid = newPaid;
      const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';

      if (isOnline && newPaid > currPaid) {
        dbPaid = currPaid;
      }

      let newOwed = newTotal - dbPaid;
      let amountToBalance = 0;
      if (newPaymentStatus === PaymentStatus.TO_BILL) {
        amountToBalance = newOwed;
        newOwed = 0;
      }

      const refundAmount = await this.handleVoucherUpdateUnified(
        Number(id),
        'LAWN',
        membershipNo,
        newTotal,
        newPaid,
        newPaymentStatus,
        currTotal,
        currPaid,
        currStatus,
        {
          lawnName: lawn.description || undefined,
          bookingDate: booking,
          endDate: endDate,
          eventTime: currentSlot,
          remarks: remarks,
          bookingDetails: bookingDetails || [],
        },
        (paymentMode as unknown as PaymentMode) || PaymentMode.CASH,
        'admin',
        updatedBy,
        card_number,
        check_number,
        bank_name,
      );

      const paidDiff = dbPaid - currPaid;
      const owedDiff = newOwed - (currTotal - currPaid);

      // ── MANAGE HOLDS ──
      await prisma.lawnHoldings.deleteMany({
        where: { lawnId: lawn.id, holdBy: membershipNo.toString() },
      });
      const holdData: any[] = [];
      for (let i = 0; i < numberOfDays; i++) {
        const d = new Date(booking);
        d.setDate(booking.getDate() + i);
        d.setHours(0, 0, 0, 0);
        holdData.push({
          lawnId: lawn.id,
          onHold: true,
          fromDate: d,
          toDate: d,
          timeSlot: currentSlot,
          holdExpiry: endDate,
          holdBy: membershipNo.toString(),
        });
      }
      await prisma.lawnHoldings.createMany({ data: holdData });

      // ── UPDATE ──
      const updated = await prisma.lawnBooking.update({
        where: { id: Number(id) },
        data: {
          lawnId: lawn.id,
          memberId: member.Sno,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          totalPrice: newTotal,
          paymentStatus: newPaymentStatus,
          pricingType,
          paidAmount: newPaid,
          pendingAmount: newOwed,
          guestsCount: Number(numberOfGuests),
          bookingTime: currentSlot as any,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          eventType,
          refundAmount,
          refundReturned: false,
          bookingDetails: bookingDetails || [],
          updatedBy,
        },
      });

      // ── LEDGER ──
      if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
        await prisma.member.update({
          where: { Membership_No: membershipNo },
          data: {
            bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
            bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
            bookingBalance: {
              increment: Math.round(Number(paidDiff) - Number(owedDiff)),
            },
            Balance: { increment: Math.round(amountToBalance) },
            drAmount: { increment: Math.round(amountToBalance) },
          },
        });
      }

      return {
        success: true,
        message: 'Lawn booking updated',
        booking: updated,
        refundAmount,
      };
    });
  }

  async cCancellationRequestLawn(bookingId: number, reason: string, requestedBy?: string) {
    const booking = await this.prismaService.lawnBooking.findUnique({
      where: { id: bookingId },
      include: {
        cancellationRequests: {
          where: { OR: [{ status: 'PENDING' }, { status: 'APPROVED' }] }
        }
      }
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.cancellationRequests && booking.cancellationRequests.length > 0) {
      throw new BadRequestException('A cancellation request is already pending or approved for this booking');
    }

    return await this.prismaService.lawnCancellationRequest.create({
      data: {
        bookingId: booking.id,
        reason: reason || 'Booking cancellation requested by admin',
        requestedBy: requestedBy || 'Admin',
        status: 'PENDING',
      },
    });
  }

  async cBookingLawnMember(payload: any, createdBy: string = 'member') {
    const {
      membershipNo,
      entityId,
      bookingDate,
      endDate: endDateInput,
      totalPrice,
      paymentStatus = 'PAID',
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      numberOfGuests,
      eventTime,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      eventType,
      bookingDetails,
      card_number,
      check_number,
      bank_name,
    } = payload;

    if (
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !numberOfGuests ||
      !eventTime ||
      !eventType
    )
      throw new BadRequestException('Required fields missing');

    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });
    if (!member) throw new NotFoundException('Member not found');

    const lawn = await this.prismaService.lawn.findFirst({
      where: { id: Number(entityId) },
      include: { outOfOrders: true },
    });
    if (!lawn) throw new NotFoundException('Lawn not found');
    if (!lawn.isActive) throw new ConflictException('Lawn is not active');

    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (booking < today)
      throw new ConflictException('Booking date cannot be in past');

    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const currentSlot = eventTime.toUpperCase();

    return await this.prismaService.$transaction(async (prisma) => {
      // ── CONFLICT CHECKS ──
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        const outOfOrderConflict = lawn.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict)
          throw new ConflictException(
            `Lawn out of order on ${currentCheckDate.toDateString()}`,
          );

        const existingBookings = await prisma.lawnBooking.findMany({
          where: {
            lawnId: lawn.id,
            bookingDate: { lte: currentCheckDate },
            endDate: { gte: currentCheckDate },
            isCancelled: false,
          },
        });

        for (const existingBooking of existingBookings) {
          const details = existingBooking.bookingDetails as any[];
          let hasConflict = false;
          if (details && Array.isArray(details) && details.length > 0) {
            const conflictDetail = details.find((d: any) => {
              const dDate = new Date(d.date);
              dDate.setHours(0, 0, 0, 0);
              return (
                dDate.getTime() === currentCheckDate.getTime() &&
                d.timeSlot === currentSlot
              );
            });
            if (conflictDetail) hasConflict = true;
          } else {
            if (existingBooking.bookingTime === currentSlot) hasConflict = true;
          }
          if (hasConflict)
            throw new ConflictException(
              `Lawn already booked on ${currentCheckDate.toDateString()}`,
            );
        }

        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);
        const confReservation = await prisma.lawnReservation.findFirst({
          where: {
            lawnId: lawn.id,
            timeSlot: currentSlot,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });
        if (confReservation)
          throw new ConflictException(
            `Lawn reserved on ${currentCheckDate.toDateString()}`,
          );

        const holding = await prisma.lawnHoldings.findFirst({
          where: {
            lawnId: lawn.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              { fromDate: null },
            ],
          },
        });
        if (holding)
          throw new ConflictException(
            `Lawn is on hold on ${currentCheckDate.toDateString()}`,
          );
      }

      // ── CAPACITY ──
      if (numberOfGuests < (lawn.minGuests || 0))
        throw new ConflictException(
          `Guests (${numberOfGuests}) below minimum ${lawn.minGuests}`,
        );
      if (numberOfGuests > lawn.maxGuests)
        throw new ConflictException(
          `Guests (${numberOfGuests}) exceeds maximum ${lawn.maxGuests}`,
        );

      // ── PAYMENT ──
      const basePrice =
        pricingType === 'member' ? lawn.memberCharges : lawn.guestCharges;
      const slotsCount = (bookingDetails as any[])?.length || numberOfDays;
      const total = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * slotsCount;
      let paid = 0,
        owed = total;
      let amountToBalance = 0;
      const isToBill = paymentStatus === 'TO_BILL';
      if (paymentStatus === 'PAID') {
        paid = total;
        owed = 0;
      } else if (paymentStatus === 'HALF_PAID') {
        paid = Number(paidAmount) || 0;
        if (paid <= 0 || paid >= total)
          throw new ConflictException(
            'For half-paid: paid amount must be >0 and <total',
          );
        owed = total - paid;
      }
      if (isToBill) {
        amountToBalance = owed;
        owed = 0;
      }

      // ── CREATE ──
      const booked = await prisma.lawnBooking.create({
        data: {
          memberId: member.Sno,
          lawnId: lawn.id,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          guestsCount: numberOfGuests!,
          totalPrice: total,
          paymentStatus: paymentStatus,
          pricingType,
          paidAmount: paid,
          pendingAmount: owed,
          bookingTime: currentSlot,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          eventType,
          bookingDetails: bookingDetails || [],
          createdBy,
          updatedBy: '-',
        },
        include: {
          lawn: {
            select: { description: true, minGuests: true, maxGuests: true },
          },
        },
      });

      // ── CLEAR TEMPORARY HOLDS ──────────────────────────────
      await prisma.lawnHoldings.deleteMany({
        where: { lawnId: lawn.id, holdBy: membershipNo.toString() },
      });

      // ── LEDGER ──
      await prisma.member.update({
        where: { Membership_No: membershipNo.toString() },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: new Date(),
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(owed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(owed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // ── VOUCHER ──
      if (paid > 0) {
        const vRemarks = this.formatLawnBookingRemarks(
          lawn.description || "",
          bookingDetails || [],
          booking,
          currentSlot,
        );

        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'LAWN',
            booking_id: booked.id,
            membership_no: membershipNo.toString(),
            amount: paid,
            payment_mode: paymentMode as unknown as PaymentMode,
            voucher_type:
              paymentStatus === 'PAID'
                ? VoucherType.FULL_PAYMENT
                : VoucherType.HALF_PAYMENT,
            status: VoucherStatus.CONFIRMED,
            issued_by: 'member',
            remarks: `${vRemarks} | Member Booking`,
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }

      return {
        success: true,
        message: `Booked ${lawn.description}`,
        booking: booked,
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: owed,
        capacity: { minGuests: lawn.minGuests, maxGuests: lawn.maxGuests },
      };
    });
  }

  async uBookingLawnMember(payload: any, updatedBy: string = 'member') {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      endDate: endDateInput,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      numberOfGuests,
      eventTime,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      remarks,
      eventType,
      bookingDetails,
    } = payload;

    if (
      !id ||
      !membershipNo ||
      !entityId ||
      !bookingDate ||
      !numberOfGuests ||
      !eventTime ||
      !eventType
    )
      throw new BadRequestException('Required fields missing');

    const existing = await this.prismaService.lawnBooking.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) throw new NotFoundException('Lawn booking not found');

    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });
    if (!member) throw new NotFoundException('Member not found');

    const lawn = await this.prismaService.lawn.findFirst({
      where: { id: Number(entityId) },
      include: { outOfOrders: true },
    });
    if (!lawn) throw new NotFoundException('Lawn not found');

    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);
    const endDate = endDateInput ? new Date(endDateInput) : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const currentSlot = eventTime.toUpperCase();

    return await this.prismaService.$transaction(async (prisma) => {
      // ── CONFLICT CHECKS ──
      for (let i = 0; i < numberOfDays; i++) {
        const currentCheckDate = new Date(booking);
        currentCheckDate.setDate(booking.getDate() + i);
        currentCheckDate.setHours(0, 0, 0, 0);
        const outOfOrderConflict = lawn.outOfOrders?.find((period) => {
          const start = new Date(period.startDate).setHours(0, 0, 0, 0);
          const end = new Date(period.endDate).setHours(0, 0, 0, 0);
          return (
            currentCheckDate.getTime() >= start &&
            currentCheckDate.getTime() <= end
          );
        });
        if (outOfOrderConflict)
          throw new ConflictException(
            `Lawn out of order on ${currentCheckDate.toDateString()}`,
          );

        const confBooking = await prisma.lawnBooking.findFirst({
          where: {
            lawnId: lawn.id,
            id: { not: Number(id) },
            bookingDate: { lte: currentCheckDate },
            endDate: { gte: currentCheckDate },
            bookingTime: currentSlot,
            isCancelled: false,
          },
        });
        if (confBooking)
          throw new ConflictException(
            `Lawn already booked on ${currentCheckDate.toDateString()}`,
          );

        const dayStart = new Date(currentCheckDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentCheckDate);
        dayEnd.setHours(23, 59, 59, 999);
        const confReservation = await prisma.lawnReservation.findFirst({
          where: {
            lawnId: lawn.id,
            timeSlot: currentSlot,
            reservedFrom: { lte: dayEnd },
            reservedTo: { gte: dayStart },
          },
        });
        if (confReservation)
          throw new ConflictException(
            `Lawn reserved on ${currentCheckDate.toDateString()}`,
          );

        const holding = await prisma.lawnHoldings.findFirst({
          where: {
            lawnId: lawn.id,
            onHold: true,
            holdExpiry: { gt: new Date() },
            NOT: { holdBy: membershipNo.toString() },
            OR: [
              {
                fromDate: { lte: currentCheckDate },
                toDate: { gte: currentCheckDate },
                timeSlot: currentSlot,
              },
              { fromDate: null },
            ],
          },
        });
        if (holding)
          throw new ConflictException(
            `Lawn is on hold on ${currentCheckDate.toDateString()}`,
          );
      }

      // ── CAPACITY ──
      if (numberOfGuests < (lawn.minGuests || 0))
        throw new ConflictException(
          `Guests (${numberOfGuests}) below minimum ${lawn.minGuests}`,
        );
      if (numberOfGuests > lawn.maxGuests)
        throw new ConflictException(
          `Guests (${numberOfGuests}) exceeds maximum ${lawn.maxGuests}`,
        );

      // ── PAYMENT ──
      const currTotal = Number(existing.totalPrice);
      const currPaid = Number(existing.paidAmount);
      const currStatus = existing.paymentStatus as unknown as PaymentStatus;
      const basePrice =
        pricingType === 'member' ? lawn.memberCharges : lawn.guestCharges;
      const slotsCount = (bookingDetails as any[])?.length || numberOfDays;
      const newTotal = totalPrice
        ? Number(totalPrice)
        : Number(basePrice) * slotsCount;
      let newPaymentStatus =
        (paymentStatus as unknown as PaymentStatus) || currStatus;

      // Auto-downgrade status if price increases and was previously PAID
      if (
        !paymentStatus &&
        currStatus === (PaymentStatus.PAID as unknown) &&
        newTotal > currPaid
      ) {
        newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
      }
      let newPaid = currPaid;
      if (newPaymentStatus === PaymentStatus.PAID) newPaid = newTotal;
      else if (newPaymentStatus === PaymentStatus.UNPAID) newPaid = 0;
      else newPaid = paidAmount !== undefined ? Number(paidAmount) : currPaid;
      let newOwed = newTotal - newPaid;
      let amountToBalance = 0;
      if (newPaymentStatus === PaymentStatus.TO_BILL) {
        amountToBalance = newOwed;
        newOwed = 0;
      }

      const refundAmount = await this.handleVoucherUpdateUnified(
        Number(id),
        'LAWN',
        membershipNo.toString(),
        newTotal,
        newPaid,
        newPaymentStatus,
        currTotal,
        currPaid,
        currStatus,
        {
          lawnName: lawn.description || undefined,
          bookingDate: booking,
          endDate: endDate,
          eventTime: currentSlot,
          remarks: remarks,
          bookingDetails: bookingDetails || [],
        },
        (paymentMode as unknown as PaymentMode) || PaymentMode.ONLINE,
        'member',
      );

      const paidDiff = newPaid - currPaid;
      const owedDiff = newOwed - (currTotal - currPaid);

      // ── MANAGE HOLDS ──
      await prisma.lawnHoldings.deleteMany({
        where: { lawnId: lawn.id, holdBy: membershipNo.toString() },
      });
      const holdData: any[] = [];
      for (let i = 0; i < numberOfDays; i++) {
        const d = new Date(booking);
        d.setDate(booking.getDate() + i);
        d.setHours(0, 0, 0, 0);
        holdData.push({
          lawnId: lawn.id,
          onHold: true,
          fromDate: d,
          toDate: d,
          timeSlot: currentSlot,
          holdExpiry: endDate,
          holdBy: membershipNo.toString(),
        });
      }
      await prisma.lawnHoldings.createMany({ data: holdData });

      // ── UPDATE ──
      const updated = await prisma.lawnBooking.update({
        where: { id: Number(id) },
        data: {
          lawnId: lawn.id,
          memberId: member.Sno,
          bookingDate: booking,
          endDate: endDate,
          numberOfDays: numberOfDays,
          totalPrice: newTotal,
          paymentStatus: newPaymentStatus,
          pricingType,
          paidAmount: newPaid,
          pendingAmount: newOwed,
          guestsCount: Number(numberOfGuests),
          bookingTime: currentSlot,
          paidBy,
          guestName,
          guestContact: guestContact?.toString(),
          eventType,
          refundAmount,
          refundReturned: false,
          bookingDetails: bookingDetails || [],
          updatedBy,
        },
      });

      // ── LEDGER ──
      if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
        await prisma.member.update({
          where: { Sno: member.Sno },
          data: {
            bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
            bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
            bookingBalance: {
              increment: Math.round(Number(paidDiff) - Number(owedDiff)),
            },
            lastBookingDate: new Date(),
            Balance: { increment: Math.round(amountToBalance) },
            drAmount: { increment: Math.round(amountToBalance) },
          },
        });
      }

      return {
        success: true,
        message: 'Lawn booking updated',
        booking: updated,
        refundAmount,
      };
    });
  }

  // helper methods
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

  private hasScheduledMaintenance(outOfOrders: any[]): boolean {
    if (!outOfOrders || outOfOrders.length === 0) return false;

    const now = new Date();
    return outOfOrders.some((period) => {
      const start = new Date(period.startDate);
      return start > now;
    });
  }

  // photoshoot booking

  async cBookingPhotoshoot(payload: BookingDto, createdBy: string) {
    const {
      membershipNo,
      entityId,
      checkIn,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      timeSlot,
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      reservationId,
      card_number,
      check_number,
      bank_name,
    } = payload;

    // 1. Validate Member
    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo },
    });
    if (!member) throw new NotFoundException('Member not found');

    // 2. Validate Photoshoot Service
    const photoshoot = await this.prismaService.photoshoot.findUnique({
      where: { id: Number(entityId) },
    });
    if (!photoshoot)
      throw new NotFoundException('Photoshoot service not found');

    // ── DELETE RESERVATION IF PROVIDED ──────────────────────
    if (reservationId) {
      await this.prismaService.photoshootReservation.deleteMany({
        where: { id: Number(reservationId) },
      });
    }

    // 3. Validate Date and Time
    if (!timeSlot) throw new BadRequestException('Time slot is required');

    // FIXED: Proper datetime parsing
    const startTime = new Date(timeSlot);

    // Validate the date is valid
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid time slot format');
    }

    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    // FIXED: Extract date part properly
    const bookingDate = new Date(startTime);

    const now = new Date();

    // Check if booking datetime is in the past
    // Allow small buffer (e.g. 1 min) for "now" bookings or just check date part
    // If strict time check is needed, ensure it allows current time
    if (startTime.getTime() < now.getTime() - 60000) {
      // Allow 1 min grace
      // But if it is today, maybe we allow it?
      // Let's just ensure date is not yesterday
      const bookingDateOnly = new Date(startTime);
      bookingDateOnly.setHours(0, 0, 0, 0);
      const todayDateOnly = new Date(now);
      todayDateOnly.setHours(0, 0, 0, 0);

      if (bookingDateOnly < todayDateOnly) {
        throw new ConflictException('Booking date cannot be in the past');
      }
      // If same day, allow it (admin might be backdating slightly or exact time)
    }

    // Validate time slot is between 9am and 6pm (since booking is 2 hours, last slot ends at 8pm)
    // Validate time slot is between 9am and 6pm
    const bookingHour = startTime.getHours();
    // 9:00 (9) to 18:00 (18) — since 18:00 means ending at 20:00, usually "last slot" is 6pm start
    if (bookingHour < 9 || bookingHour > 18) {
      throw new BadRequestException(
        'Photoshoot bookings are only available between 9:00 AM and 6:00 PM',
      );
    }

    // 4. Calculate Price
    const basePrice =
      pricingType === 'member'
        ? photoshoot.memberCharges
        : photoshoot.guestCharges;
    const slotsCount = (payload.bookingDetails as any[])?.length || 1;

    // If totalPrice is provided, use it, otherwise calculate
    const total = totalPrice
      ? Number(totalPrice)
      : Number(basePrice) * slotsCount;

    let paid = 0;
    let owed = total;
    let amountToBalance = 0;
    const isToBill = (paymentStatus as unknown as string) === 'TO_BILL';

    if (paymentStatus === (PaymentStatus.PAID as unknown) || String(paymentStatus) === 'PAID') {
      paid = total;
      owed = 0;
    } else if (
      paymentStatus === (PaymentStatus.HALF_PAID as unknown) ||
      String(paymentStatus) === 'HALF_PAID' ||
      paymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) ||
      String(paymentStatus) === 'ADVANCE_PAYMENT'
    ) {
      paid = Number(paidAmount) || 0;
      owed = total - paid;
    } else if (isToBill) {
      amountToBalance = owed;
      owed = 0;
    } else {
      paid = 0;
      owed = total;
    }

    // 5. Create Booking
    const booking = await this.prismaService.photoshootBooking.create({
      data: {
        memberId: member.Sno,
        photoshootId: photoshoot.id,
        bookingDate: bookingDate,
        startTime: startTime,
        endTime: endTime,
        totalPrice: total,
        paymentStatus: paymentStatus as unknown as PaymentStatus,
        pricingType,
        paidAmount: paid,
        pendingAmount: owed,
        paidBy: paidBy === 'GUEST' ? 'GUEST' : 'MEMBER',
        guestName,
        guestContact,
        bookingDetails: payload.bookingDetails || [],
        createdBy,
        updatedBy: '-',
      },
    });

    // 6. Update Member Ledger
    await this.prismaService.member.update({
      where: { Sno: member.Sno },
      data: {
        totalBookings: { increment: 1 },
        lastBookingDate: new Date(),
        bookingAmountPaid: { increment: Math.round(Number(paid)) },
        bookingAmountDue: { increment: Math.round(Number(owed)) },
        bookingBalance: { increment: Math.round(Number(paid) - Number(owed)) },
        Balance: { increment: Math.round(amountToBalance) },
        drAmount: { increment: Math.round(amountToBalance) },
      },
    });

    // 7. Create Voucher
    if (paid > 0) {
      let voucherType: VoucherType | null = null;
      if (paymentStatus === (PaymentStatus.PAID as unknown) || String(paymentStatus) === 'PAID')
        voucherType = VoucherType.FULL_PAYMENT;
      else if (paymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) || String(paymentStatus) === 'ADVANCE_PAYMENT')
        voucherType = VoucherType.ADVANCE_PAYMENT;
      else
        voucherType = VoucherType.HALF_PAYMENT;

      const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';
      const vStatus = isOnline ? VoucherStatus.PENDING : VoucherStatus.CONFIRMED;

      const vno = generateNumericVoucherNo();
      await this.prismaService.paymentVoucher.create({
        data: {
          consumer_number: generateConsumerNumber(Number(vno)),
          voucher_no: vno,
          booking_type: 'PHOTOSHOOT',
          booking_id: booking.id,
          membership_no: membershipNo,
          amount: paid,
          payment_mode: paymentMode as unknown as PaymentMode,
          voucher_type: voucherType!,
          status: vStatus,
          issued_by: 'admin',
          paid_at: vStatus === VoucherStatus.CONFIRMED ? new Date() : null,
          expiresAt: isOnline ? new Date(Date.now() + 60 * 60 * 1000) : null,
          remarks: `Photoshoot | ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}`,
          card_number,
          check_number,
          bank_name,
        } as any,
      });
    }

    return booking;
  }

  async uBookingPhotoshoot(payload: Partial<BookingDto>, updatedBy: string) {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode,
      timeSlot,
      paidBy,
      guestName,
      guestContact,
      remarks,
      card_number,
      check_number,
      bank_name,
    } = payload;

    if (!id || !membershipNo || !entityId)
      throw new BadRequestException('Required fields missing');

    const existing = await this.prismaService.photoshootBooking.findUnique({
      where: { id: Number(id) },
      include: { member: true, photoshoot: true },
    });
    if (!existing) throw new NotFoundException('Booking not found');

    const booking = bookingDate
      ? new Date(bookingDate)
      : new Date(existing.bookingDate);
    booking.setHours(0, 0, 0, 0);

    // ── BOOKING DETAILS NORMALIZATION ──
    const bookingDetailsIn =
      payload.bookingDetails || (existing.bookingDetails as any[]) || [];
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];

    // If payload has details, process them. If not, fallback to existing or single date inputs
    if (payload.bookingDetails && payload.bookingDetails.length > 0) {
      for (const detail of payload.bookingDetails) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType, // Optional for photoshoot
        });
      }
    } else if (
      bookingDetailsIn &&
      bookingDetailsIn.length > 0 &&
      !payload.bookingDate &&
      !timeSlot
    ) {
      // Keep existing details if no list AND no single-date override provided
      for (const detail of bookingDetailsIn) {
        const dDate = new Date(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType,
        });
      }
    } else {
      // Construct from single date/time (legacy/simple update)
      // If timeSlot provided, use it. Else existing.
      let newStartStr = timeSlot;
      if (!newStartStr && existing.startTime) {
        newStartStr = existing.startTime.toLocaleTimeString(); // Fallback might be tricky with timezone, better to trust payload or existing flow
      }
      // For Photoshoot, timeSlot is usually full date-time string in previous implementation?
      // "2024-05-10T10:00:00.000Z"
      // If we are moving to proper structure, we should handle `timeSlot` as just time if separated, or datetime.
      // Current implementation uses `parsePakistanDate(timeSlot)` which implies datetime string.

      let targetDate = booking;
      let targetSlot = newStartStr;

      if (timeSlot) {
        const d = parsePakistanDate(timeSlot);
        targetDate = new Date(d);
        targetDate.setHours(0, 0, 0, 0);
        // For slot, we might want "10:00 AM" format if using granular checks like Hall?
        // But Photoshoot uses full datetime checks usually.
        // Let's stick to storing the date and the *startTime* as the slot identifier for checks?
        // Or just store the ISO string.
        targetSlot = d.toISOString();
      }

      normalizedDetails.push({
        date: targetDate,
        timeSlot: targetSlot || existing.startTime.toISOString(),
      });
    }

    // Resolve start/end times for the MAIN record (first slot)
    // This maintains backward compatibility
    const firstDetail = normalizedDetails[0];
    const newMainDate = firstDetail.date;
    let newMainStartTime = existing.startTime;
    let newMainEndTime = existing.endTime;

    if (payload.bookingDetails && payload.bookingDetails.length > 0) {
      // If we have explicit details, try to parse the time from the first one
      // If timeSlot is just "MORNING", this fails for Photoshoot which needs specific time?
      // Photoshoot usually needs specific time.
      // If the UI is sending specific time in `timeSlot` (e.g. ISO string or "10:00"), handle it.
      // Assuming `timeSlot` in bookingDetails contains the full datetime or time string
      try {
        // Try to parse as date
        const d = new Date(firstDetail.timeSlot);
        if (!isNaN(d.getTime())) {
          newMainStartTime = d;
          newMainEndTime = new Date(d.getTime() + 2 * 60 * 60 * 1000);
        }
      } catch (e) { }
    } else if (timeSlot) {
      const d = parsePakistanDate(timeSlot);
      newMainStartTime = d;
      newMainEndTime = new Date(d.getTime() + 2 * 60 * 60 * 1000);
    }

    // ── CONFLICT CHECKS (Granular) ─────────────────────────
    // Only check if details/dates changed
    const detailsChanged =
      existing.photoshootId !== Number(entityId) ||
      existing.bookingDate.getTime() !== booking.getTime() ||
      JSON.stringify(existing.bookingDetails) !==
      JSON.stringify(normalizedDetails) ||
      (timeSlot &&
        parsePakistanDate(timeSlot).getTime() !== existing.startTime.getTime());

    if (detailsChanged) {
      for (const detail of normalizedDetails) {
        const currentCheckDate = detail.date;
        // For Photoshoot, timeSlot might be a specific time.
        // We need to check overlaps.
        // If it's a fixed slot system (MORNING/EVENING), easy match.
        // If it's flexible time, we need range check.
        // Assuming "similar to Hall" means strict slots or at least checking the specific requested time.

        // If the inputs are flexible times:
        let start = new Date(currentCheckDate);
        let end = new Date(currentCheckDate);

        // Try parse detail.timeSlot
        const d = new Date(detail.timeSlot);
        if (!isNaN(d.getTime())) {
          start = d;
          end = new Date(d.getTime() + 2 * 60 * 60 * 1000);
        } else {
          // If it's not a date string, skip complex overlap check or assume it's a label?
          continue;
        }

        const conflictingBooking =
          await this.prismaService.photoshootBooking.findFirst({
            where: {
              photoshootId: Number(entityId),
              id: { not: Number(id) },
              bookingDate: currentCheckDate,
              isCancelled: false,
              OR: [
                {
                  AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
                },
              ],
            },
          });

        if (conflictingBooking) {
          throw new ConflictException(
            `Photoshoot service already booked for ${start.toLocaleTimeString()} on ${currentCheckDate.toDateString()}`,
          );
        }
      }
    }

    // ── PRICE CALCULATION ──────────────────────────────────
    const photoshoot = await this.prismaService.photoshoot.findUnique({
      where: { id: Number(entityId) },
    });
    if (!photoshoot) throw new BadRequestException('Photoshoot not found');

    const basePrice =
      pricingType === 'member'
        ? photoshoot.memberCharges
        : photoshoot.guestCharges;
    const slotsCount = normalizedDetails.length;

    // If totalPrice is NOT provided, recalc based on slots
    const newTotal =
      totalPrice !== undefined
        ? Number(totalPrice)
        : Number(basePrice) * slotsCount;

    // ── PAYMENT CALCULATIONS ────────────────────────────────
    const currTotal = Number(existing.totalPrice);
    const currPaid = Number(existing.paidAmount);
    const currStatus = existing.paymentStatus as unknown as PaymentStatus;

    let newPaymentStatus =
      (paymentStatus as unknown as PaymentStatus) || currStatus;
    const isPriceIncrease = newTotal > currPaid;
    const isExplicitPayment = paidAmount !== undefined;
    const isStatusUnchanged =
      !paymentStatus ||
      (paymentStatus as unknown as PaymentStatus) === currStatus;

    let newPaid = currPaid;

    // Auto-downgrade to HALF_PAID if price increased and no new payment made
    if (
      isPriceIncrease &&
      !isExplicitPayment &&
      isStatusUnchanged &&
      (currStatus === (PaymentStatus.PAID as unknown) || currStatus === 'PAID')
    ) {
      newPaymentStatus = PaymentStatus.HALF_PAID as unknown as PaymentStatus;
      newPaid = currPaid;
    } else {
      if (
        newPaymentStatus === (PaymentStatus.PAID as unknown) ||
        newPaymentStatus === 'PAID'
      ) {
        newPaid = newTotal;
      } else if (
        newPaymentStatus === (PaymentStatus.UNPAID as unknown) ||
        newPaymentStatus === 'UNPAID'
      ) {
        newPaid = 0;
      } else if (
        newPaymentStatus === (PaymentStatus.HALF_PAID as unknown) ||
        newPaymentStatus === 'HALF_PAID' ||
        newPaymentStatus === (PaymentStatus.ADVANCE_PAYMENT as unknown) ||
        newPaymentStatus === 'ADVANCE_PAYMENT'
      ) {
        newPaid = isExplicitPayment ? Number(paidAmount) : currPaid;
      }
    }

    // NEW LOGIC: Only stagnate db ledger (paidAmount) if the increase is ONLINE
    let dbPaid = newPaid;
    const isOnline = paymentMode === PaymentMode.ONLINE || String(paymentMode) === 'ONLINE';

    if (isOnline && newPaid > currPaid) {
      dbPaid = currPaid;
    }

    let newOwed = newTotal - dbPaid;
    let amountToBalance = 0;
    if (newPaymentStatus === PaymentStatus.TO_BILL) {
      amountToBalance = newOwed;
      newOwed = 0;
    }

    const refundAmount = await this.handleVoucherUpdateUnified(
      Number(id),
      'PHOTOSHOOT',
      membershipNo,
      newTotal,
      newPaid,
      newPaymentStatus,
      currTotal,
      currPaid,
      currStatus,
      {
        photoshootDesc: photoshoot.description || undefined,
        bookingDate: newMainDate,
        eventTime: newMainStartTime.toLocaleTimeString(),
        bookingDetails: normalizedDetails,
        remarks: remarks,
      },
      (paymentMode as unknown as PaymentMode) || PaymentMode.CASH,
      'admin',
      updatedBy,
      card_number,
      check_number,
      bank_name,
    );

    const paidDiff = dbPaid - currPaid;
    const owedDiff = newOwed - (currTotal - currPaid);

    // ── UPDATE BOOKING ───────────────────────────────────────
    const updated = await this.prismaService.photoshootBooking.update({
      where: { id: Number(id) },
      data: {
        photoshootId: Number(entityId),
        memberId: existing.memberId,
        bookingDate: newMainDate,
        startTime: newMainStartTime,
        endTime: newMainEndTime,
        totalPrice: newTotal,
        paymentStatus: newPaymentStatus,
        pricingType: pricingType ?? existing.pricingType,
        paidAmount: dbPaid,
        pendingAmount: newOwed,
        refundAmount,
        paidBy: paidBy || existing.paidBy, // Preserve existing if not provided
        guestName: guestName || existing.guestName,
        guestContact: guestContact?.toString() || existing.guestContact,
        refundReturned: false,
        bookingDetails: normalizedDetails,
        remarks: remarks ?? existing.remarks,
        updatedBy,
      },
    });

    // ── UPDATE MEMBER LEDGER ─────────────────────────────────
    if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
      await this.prismaService.member.update({
        where: { Sno: existing.memberId },
        data: {
          bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
          bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
          bookingBalance: {
            increment: Math.round(Number(paidDiff) - Number(owedDiff)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });
    }

    // Update voucher remarks if date/time changed (logic handled inside handleVoucherUpdateUnified partially, but updateVoucherDates is separate for Room)
    // For Photoshoot, handleVoucherUpdateUnified handles remarks.

    return updated;
  }
  async gBookingPhotoshoot(page?: number, limit?: number) {
    const args: any = {
      where: {
        isCancelled: false,
        cancellationRequests: {
          none: { status: 'PENDING' }
        }
      },
      orderBy: { bookingDate: 'asc' }, // The original was asc? usually desc for recent.. keeping as original
      include: {
        member: {
          select: {
            Membership_No: true,
            Name: true,
            Balance: true,
          },
        },
        photoshoot: true,
        cancellationRequests: true,
      },
    };

    if (page && limit) {
      args.skip = (Number(page) - 1) * Number(limit);
      args.take = Number(limit);
    }

    const bookings = await this.prismaService.photoshootBooking.findMany(args);
    return bookings.map(b => this.attachActiveCancellationRequest(b));
  }

  // member photoshoot booking
  async cBookingPhotoshootMember(payload: any, createdBy: string = 'member') {
    const {
      membershipNo,
      entityId,
      bookingDate,
      totalPrice,
      paymentStatus = 'PAID',
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      timeSlot,
      specialRequests = '',
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      card_number,
      check_number,
      bank_name,
    } = payload;

    // ── 1. VALIDATE REQUIRED FIELDS ─────────────────────────
    if (!membershipNo)
      throw new BadRequestException('Membership number is required');
    if (!entityId)
      throw new BadRequestException('Photoshoot service ID is required');
    if (!bookingDate) throw new BadRequestException('Booking date is required');
    if (!timeSlot) throw new BadRequestException('Time slot is required');

    // ── 2. VALIDATE BOOKING DATE & TIME ─────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const booking = new Date(bookingDate);

    if (booking < today) {
      throw new ConflictException('Booking date cannot be in the past');
    }

    const startTime = parsePakistanDate(timeSlot);
    const now = getPakistanDate();

    if (startTime < now) {
      throw new ConflictException('Booking time cannot be in the past');
    }

    // Validate time slot is between 9am and 6pm (since booking is 2 hours, last slot ends at 8pm)
    const bookingHour = startTime.getHours();
    // if (bookingHour < 9 && bookingHour > 6) {
    //   throw new BadRequestException(
    //     'Photoshoot bookings are only available between 9:00 AM and 6:00 PM',
    //   );
    // }

    // ── 3. VALIDATE MEMBER ─────────────────────────────────
    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo.toString() },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Use transaction for atomic operations
    return await this.prismaService.$transaction(async (prisma) => {
      // ── 4. VALIDATE PHOTOSHOOT SERVICE ────────────────────
      const photoshoot = await prisma.photoshoot.findFirst({
        where: { id: Number(entityId) },
      });

      if (!photoshoot) {
        throw new NotFoundException('Photoshoot service not found');
      }

      // ── 5. CALCULATE END TIME ────────────────────────────
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      // REMOVED: Booking conflict check to allow same date/time

      // ── 6. CALCULATE PRICE BASED ON PRICING TYPE ──────────
      const basePrice =
        pricingType === 'member'
          ? photoshoot.memberCharges
          : photoshoot.guestCharges;
      const total = totalPrice ? Number(totalPrice) : Number(basePrice);

      // ── 7. PAYMENT CALCULATIONS ───────────────────────────
      let paid = 0;
      let owed = total;

      let amountToBalance = 0;
      const isToBill = paymentStatus === 'TO_BILL';

      if (paymentStatus === 'PAID') {
        paid = total;
        owed = 0;
      } else if (paymentStatus === 'HALF_PAID') {
        paid = Number(paidAmount) || 0;
        if (paid <= 0) {
          throw new ConflictException(
            'Paid amount must be greater than 0 for half-paid status',
          );
        }
        if (paid >= total) {
          throw new ConflictException(
            'Paid amount must be less than total price for half-paid status',
          );
        }
        owed = total - paid;
      }

      if (isToBill) {
        amountToBalance = owed;
        owed = 0;
      }

      // ── 8. CREATE BOOKING ───────────────────────────────
      const booked = await prisma.photoshootBooking.create({
        data: {
          memberId: member.Sno,
          photoshootId: photoshoot.id,
          bookingDate: booking,
          startTime: startTime,
          endTime: endTime,
          totalPrice: total,
          paymentStatus: paymentStatus,
          pricingType,
          paidAmount: paid,
          pendingAmount: owed,
          paidBy,
          guestName,
          guestContact,
          createdBy,
          updatedBy: '-',
        },
        include: {
          photoshoot: {
            select: {
              description: true,
            },
          },
          member: {
            select: {
              Name: true,
              Membership_No: true,
            },
          },
        },
      });

      // ── 9. UPDATE MEMBER LEDGER ─────────────────────────
      await prisma.member.update({
        where: { Membership_No: membershipNo.toString() },
        data: {
          totalBookings: { increment: 1 },
          lastBookingDate: new Date(),
          bookingAmountPaid: { increment: Math.round(Number(paid)) },
          bookingAmountDue: { increment: Math.round(Number(owed)) },
          bookingBalance: {
            increment: Math.round(Number(paid) - Number(owed)),
          },
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });

      // ── 10. CREATE PAYMENT VOUCHER ───────────────────────
      if (paid > 0) {
        let voucherType: VoucherType | null = null;
        if (paymentStatus === ('PAID' as unknown))
          voucherType = VoucherType.FULL_PAYMENT;
        else if (paymentStatus === ('HALF_PAID' as unknown))
          voucherType = VoucherType.HALF_PAYMENT;

        const vno = generateNumericVoucherNo();
        await prisma.paymentVoucher.create({
          data: {
            consumer_number: generateConsumerNumber(Number(vno)),
            voucher_no: vno,
            booking_type: 'PHOTOSHOOT',
            booking_id: booked.id,
            membership_no: membershipNo.toString(),
            amount: paid,
            payment_mode: paymentMode as unknown as PaymentMode,
            voucher_type: voucherType!,
            status: VoucherStatus.CONFIRMED,
            issued_by: 'member',
            remarks: `Photoshoot: ${photoshoot.description} | ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}${specialRequests ? ` | Requests: ${specialRequests}` : ''}`,
            card_number,
            check_number,
            bank_name,
          } as any,
        });
      }
      // console.log(booked);
      return {
        success: true,
        message: `Successfully booked ${photoshoot.description} for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}`,
        booking: {
          id: booked.id,
          memberName: booked.member.Name,
          membershipNo: booked.member.Membership_No,
          service: booked.photoshoot.description,
          date: booked.bookingDate.toLocaleDateString(),
          timeSlot: `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`,
          duration: '2 hours',
          totalAmount: total,
          paidAmount: paid,
          pendingAmount: owed,
          paymentStatus: paymentStatus,
        },
        receipt: {
          bookingId: booked.id,
          service: photoshoot.description,
          date: startTime.toLocaleDateString(),
          time: startTime.toLocaleTimeString(),
          total: total,
          paid: paid,
          balance: owed,
        },
      };
    });
  }

  async uBookingPhotoshootMember(payload: any, updatedBy: string = 'member') {
    const {
      id,
      membershipNo,
      entityId,
      bookingDate,
      startTime,
      endTime,
      totalPrice,
      paymentStatus,
      pricingType,
      paidAmount,
      paymentMode = 'ONLINE',
      specialRequests = '',
      paidBy = 'MEMBER',
      guestName,
      guestContact,
      remarks,
    } = payload;

    // Validate required fields
    if (!id) throw new BadRequestException('Booking ID is required');
    if (!membershipNo)
      throw new BadRequestException('Membership number is required');
    if (!entityId)
      throw new BadRequestException('Photoshoot service ID is required');
    if (!bookingDate) throw new BadRequestException('Booking date is required');
    if (!startTime) throw new BadRequestException('Start time is required');
    if (!endTime) throw new BadRequestException('End time is required');

    // Parse dates and times
    const booking = new Date(bookingDate);
    booking.setHours(0, 0, 0, 0);
    const newStartTime = new Date(startTime);
    const newEndTime = new Date(endTime);

    // Get existing booking
    const existing = await this.prismaService.photoshootBooking.findUnique({
      where: { id: Number(id) },
      include: {
        member: true,
        photoshoot: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Photoshoot booking not found');
    }

    // Get member
    const member = await this.prismaService.member.findUnique({
      where: { Membership_No: membershipNo },
    });

    if (!member) {
      throw new NotFoundException(`Member ${membershipNo} not found`);
    }

    // Validate photoshoot service
    const photoshoot = await this.prismaService.photoshoot.findFirst({
      where: { id: Number(entityId) },
    });

    if (!photoshoot)
      throw new NotFoundException('Photoshoot service not found');
    if (!photoshoot.isActive) {
      throw new ConflictException('Photoshoot service is not active');
    }

    // Check for conflicting bookings (exclude current)
    const conflictingBooking =
      await this.prismaService.photoshootBooking.findFirst({
        where: {
          photoshootId: photoshoot.id,
          id: { not: Number(id) },
          bookingDate: booking,
          isCancelled: false,
          OR: [
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gt: newStartTime } },
              ],
            },
          ],
        },
      });

    if (conflictingBooking) {
      throw new ConflictException(
        `Photoshoot service already booked for this date and time slot`,
      );
    }

    // Calculate price
    const basePrice =
      pricingType === 'member'
        ? photoshoot.memberCharges
        : photoshoot.guestCharges;
    const newTotal = totalPrice ? Number(totalPrice) : Number(basePrice);

    // ── PAYMENT CALCULATIONS ────────────────────────────────
    const currTotal = Number(existing.totalPrice);
    const currPaid = Number(existing.paidAmount);
    const currStatus = existing.paymentStatus as unknown as PaymentStatus;

    const newPaymentStatus =
      (paymentStatus as unknown as PaymentStatus) || currStatus;

    let newPaid = currPaid;
    if (newPaymentStatus === PaymentStatus.PAID) {
      newPaid = newTotal;
    } else if (newPaymentStatus === PaymentStatus.UNPAID) {
      newPaid = 0;
    } else {
      newPaid = paidAmount !== undefined ? Number(paidAmount) : currPaid;
    }

    let newOwed = newTotal - newPaid;
    let amountToBalance = 0;
    if (newPaymentStatus === PaymentStatus.TO_BILL) {
      amountToBalance = newOwed;
      newOwed = 0;
    }

    const refundAmount = await this.handleVoucherUpdateUnified(
      Number(id),
      'PHOTOSHOOT',
      membershipNo,
      newTotal,
      newPaid,
      newPaymentStatus,
      currTotal,
      currPaid,
      currStatus,
      {
        photoshootDesc: photoshoot.description || undefined,
        bookingDate: booking,
        eventTime: newStartTime.toLocaleTimeString(),
        remarks: remarks,
      },
      paymentMode || PaymentMode.ONLINE,
      'member',
    );

    const paidDiff = newPaid - currPaid;
    const owedDiff = newOwed - (currTotal - currPaid);

    // ── UPDATE BOOKING ───────────────────────────────────────
    const updated = await this.prismaService.photoshootBooking.update({
      where: { id: Number(id) },
      data: {
        photoshootId: photoshoot.id,
        memberId: member.Sno,
        bookingDate: booking,
        startTime: newStartTime,
        endTime: newEndTime,
        totalPrice: newTotal,
        paymentStatus: newPaymentStatus,
        pricingType,
        paidAmount: newPaid,
        pendingAmount: newOwed,
        refundAmount,
        paidBy,
        guestName,
        guestContact: guestContact?.toString(),
        refundReturned: false,
        updatedBy,
      },
    });

    // ── UPDATE MEMBER LEDGER ─────────────────────────────────
    if (paidDiff !== 0 || owedDiff !== 0 || amountToBalance !== 0) {
      await this.prismaService.member.update({
        where: { Membership_No: membershipNo },
        data: {
          bookingAmountPaid: { increment: Math.round(Number(paidDiff)) },
          bookingAmountDue: { increment: Math.round(Number(owedDiff)) },
          bookingBalance: {
            increment: Math.round(Number(paidDiff) - Number(owedDiff)),
          },
          lastBookingDate: new Date(),
          Balance: { increment: Math.round(amountToBalance) },
          drAmount: { increment: Math.round(amountToBalance) },
        },
      });
    }

    return {
      success: true,
      message: 'Photoshoot booking updated successfully',
      booking: updated,
      refundAmount,
    };
  }

  async cCancellationRequestPhotoshoot(bookingId: number, reason: string, requestedBy?: string) {
    const booking = await this.prismaService.photoshootBooking.findUnique({
      where: { id: bookingId },
      include: {
        cancellationRequests: {
          where: { OR: [{ status: 'PENDING' }, { status: 'APPROVED' }] }
        }
      }
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.cancellationRequests && booking.cancellationRequests.length > 0) {
      throw new BadRequestException('A cancellation request is already pending or approved for this booking');
    }

    return await this.prismaService.photoshootCancellationRequest.create({
      data: {
        bookingId: booking.id,
        reason: reason || 'Booking cancellation requested by admin',
        requestedBy: requestedBy || 'Admin',
        status: 'PENDING',
      },
    });
  }

  async getMemberBookings(membershipNo: string) {
    const [roomBookings, hallBookings, lawnBookings, photoshootBookings] =
      await Promise.all([
        this.prismaService.roomBooking.findMany({
          where: { Membership_No: membershipNo },
          include: {
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
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.hallBooking.findMany({
          where: {
            member: {
              Membership_No: membershipNo,
            },
          },
          include: {
            hall: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.lawnBooking.findMany({
          where: {
            member: {
              Membership_No: membershipNo,
            },
          },
          include: {
            lawn: {
              include: {
                lawnCategory: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.photoshootBooking.findMany({
          where: {
            member: {
              Membership_No: membershipNo,
            },
          },
          include: {
            photoshoot: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    // Normalize and combine bookings
    const allBookings = [
      ...roomBookings.map((b) => ({
        id: b.id,
        type: 'Room',
        name: `Room ${b.rooms.map((r) => r.room.roomNumber).join(', ')} (${b.rooms[0]?.room.roomType?.type || 'N/A'})`,
        date: `${new Date(b.checkIn).toLocaleDateString()} - ${new Date(b.checkOut).toLocaleDateString()}`,
        amount: b.totalPrice,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        isCancelled: b.isCancelled,
        paidBy: b.paidBy,
        guestName: b.guestName,
        remarks: b.remarks,
        paidAmount: b.paidAmount,
        pendingAmount: b.pendingAmount,
        refundAmount: b.refundAmount,
        details: {
          adults: b.numberOfAdults,
          children: b.numberOfChildren,
        },
      })),
      ...hallBookings.map((b) => ({
        id: b.id,
        type: 'Hall',
        name: b.hall.name,
        date: `${new Date(b.bookingDate).toLocaleDateString()} (${b.bookingTime})`,
        amount: b.totalPrice,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        isCancelled: b.isCancelled,
        paidBy: b.paidBy,
        guestName: b.guestName,
        remarks: b.remarks,
        paidAmount: b.paidAmount,
        pendingAmount: b.pendingAmount,
        refundAmount: b.refundAmount,
        eventType: b.eventType,
        bookingDetails: b.bookingDetails,
        details: {
          guests: b.numberOfGuests,
        },
      })),
      ...lawnBookings.map((b) => ({
        id: b.id,
        type: 'Lawn',
        name: b.lawn.description,
        date: `${new Date(b.bookingDate).toLocaleDateString()} (${b.bookingTime})`,
        amount: b.totalPrice,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        isCancelled: b.isCancelled,
        paidBy: b.paidBy,
        guestName: b.guestName,
        paidAmount: b.paidAmount,
        pendingAmount: b.pendingAmount,
        refundAmount: b.refundAmount,
        eventType: b.eventType,
        bookingDetails: b.bookingDetails,
        details: {
          guests: b.guestsCount,
        },
      })),
      ...photoshootBookings.map((b) => ({
        id: b.id,
        type: 'Photoshoot',
        name: b.photoshoot.description,
        date: `${new Date(b.bookingDate).toLocaleDateString()} (${b.startTime} - ${b.endTime})`,
        amount: b.totalPrice,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        isCancelled: b.isCancelled,
        paidBy: b.paidBy,
        guestName: b.guestName,
        paidAmount: b.paidAmount,
        pendingAmount: b.pendingAmount,
        refundAmount: b.refundAmount,
        remarks: b.remarks,
        bookingDetails: b.bookingDetails,
      })),
    ];

    // Sort by date desc
    return allBookings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
  // ── VOUCHER MANAGEMENT ─────────────────────────────────────
  async getVouchersByBooking(bookingType: string, bookingId: number) {
    if (!bookingId || isNaN(bookingId)) {
      return [];
    }
    return await this.prismaService.paymentVoucher.findMany({
      where: {
        booking_type: bookingType as BookingType,
        booking_id: bookingId,
      },
      orderBy: {
        issued_at: 'desc',
      },
    });
  }

  async updateVoucherStatus(
    consumer_number: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED',
    updatedBy: string,
    paymentDetails?: {
      payment_mode: PaymentMode;
      card_number?: string;
      check_number?: string;
      bank_name?: string;
    },
  ) {
    const voucher = await this.prismaService.paymentVoucher.findUnique({
      where: { consumer_number: consumer_number },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    const data: any = {
      status: status as VoucherStatus,
      issued_by: updatedBy,
      paid_at: (status as VoucherStatus) === VoucherStatus.CONFIRMED ? new Date() : undefined,
    };

    if (paymentDetails) {
      data.payment_mode = paymentDetails.payment_mode;
      data.card_number = paymentDetails.card_number;
      data.check_number = paymentDetails.check_number;
      data.bank_name = paymentDetails.bank_name;
      data.channel = Channel.ADMIN_PORTAL;
    }

    return await this.prismaService.paymentVoucher.update({
      where: { consumer_number: consumer_number },
      data,
    });
  }

  // member bookings
  async memberBookings(
    Membership_No: string,
    type: 'Room' | 'Hall' | 'Lawn' | 'Photoshoot',
  ) {
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No },
    });
    if (!member) throw new NotFoundException(`Membership number not found`);

    if (type === 'Room') {
      const roomBookings = await this.prismaService.roomBooking.findMany({
        where: { Membership_No },
        include: {
          rooms: {
            include: {
              room: {
                include: {
                  roomType: true,
                },
              },
            },
          },
          cancellationRequests: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const bookingIds = roomBookings.map((b) => b.id);
      const vouchers = await this.prismaService.paymentVoucher.findMany({
        where: {
          booking_type: 'ROOM',
          booking_id: { in: bookingIds },
        },
        orderBy: { issued_at: 'desc' },
      });

      return roomBookings.map((b) => ({
        ...b,
        type: 'Room',
        vouchers: vouchers.filter((v) => v.booking_id === b.id),
        name: `Room ${b.rooms.map((r) => r.room.roomNumber).join(', ')} (${b.rooms[0]?.room.roomType?.type || 'N/A'})`,
      }));
    } else if (type === 'Hall') {
      const hallBookings = await this.prismaService.hallBooking.findMany({
        where: { memberId: member.Sno },
        include: { hall: true },
        orderBy: { createdAt: 'desc' },
      });

      const bookingIds = hallBookings.map((b) => b.id);
      const vouchers = await this.prismaService.paymentVoucher.findMany({
        where: {
          booking_type: 'HALL',
          booking_id: { in: bookingIds },
        },
        orderBy: { issued_at: 'desc' },
      });

      return hallBookings.map((b) => ({
        ...b,
        type: 'Hall',
        vouchers: vouchers.filter((v) => v.booking_id === b.id),
        name: b.hall.name,
      }));
    } else if (type === 'Lawn') {
      const lawnBookings = await this.prismaService.lawnBooking.findMany({
        where: { memberId: member.Sno },
        include: { lawn: { include: { lawnCategory: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const bookingIds = lawnBookings.map((b) => b.id);
      const vouchers = await this.prismaService.paymentVoucher.findMany({
        where: {
          booking_type: 'LAWN',
          booking_id: { in: bookingIds },
        },
        orderBy: { issued_at: 'desc' },
      });

      return lawnBookings.map((b) => ({
        ...b,
        type: 'Lawn',
        vouchers: vouchers.filter((v) => v.booking_id === b.id),
        name: b.lawn.description,
      }));
    } else if (type === 'Photoshoot') {
      const photoshootBookings =
        await this.prismaService.photoshootBooking.findMany({
          where: { memberId: member.Sno },
          include: { photoshoot: true },
          orderBy: { createdAt: 'desc' },
        });

      const bookingIds = photoshootBookings.map((b) => b.id);
      const vouchers = await this.prismaService.paymentVoucher.findMany({
        where: {
          booking_type: 'PHOTOSHOOT',
          booking_id: { in: bookingIds },
        },
        orderBy: { issued_at: 'desc' },
      });

      return photoshootBookings.map((b) => ({
        ...b,
        type: 'Photoshoot',
        vouchers: vouchers.filter((v) => v.booking_id === b.id),
        name: b.photoshoot.description,
      }));
    }
  }

  async cancelUnpaidBooking(consumer_number: string) {
    console.log(consumer_number)
    const voucher = await this.prismaService.paymentVoucher.findUnique({
      where: { consumer_number: consumer_number },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      throw new BadRequestException(
        'Only pending vouchers can be cancelled/deleted',
      );
    }
    const { booking_type, booking_id, membership_no } = voucher;

    return await this.prismaService.$transaction(async (prisma) => {
      // 1. Mark Voucher as Cancelled
      await prisma.paymentVoucher.update({
        where: { consumer_number: consumer_number },
        data: { status: VoucherStatus.CANCELLED, remarks: "Cancelled by Member on Payment Screen" },
      });

      // 2. Mark Booking as Cancelled and associated Holdings
      if (booking_type === 'ROOM') {
        const booking = await prisma.roomBooking.findUnique({
          where: { id: booking_id },
          include: { rooms: true },
        });
        if (booking) {
          if (booking.paymentStatus !== 'UNPAID') {
            throw new BadRequestException(
              'Cannot cancel a paid or half-paid booking recursively',
            );
          }
          const roomIds = booking.rooms.map((r) => r.roomId);
          // Delete holdings
          await prisma.roomHoldings.deleteMany({
            where: { roomId: { in: roomIds }, holdBy: membership_no },
          });
          // Mark booking as cancelled
          await prisma.roomBooking.update({
            where: { id: booking_id },
            data: { isCancelled: true, remarks: "Cancelled by Member on Payment Screen" },
          });
        }
      } else if (booking_type === 'HALL') {
        const booking = await prisma.hallBooking.findUnique({
          where: { id: booking_id },
        });
        if (booking) {
          if (booking.paymentStatus !== 'UNPAID') {
            throw new BadRequestException(
              'Cannot cancel a paid or half-paid booking recursively',
            );
          }
          await prisma.hallHoldings.deleteMany({
            where: { hallId: booking.hallId, holdBy: membership_no },
          });
          await prisma.hallBooking.update({
            where: { id: booking_id },
            data: { isCancelled: true, remarks: "Cancelled by Member on Payment Screen" },
          });
        }
      } else if (booking_type === 'LAWN') {
        const booking = await prisma.lawnBooking.findUnique({
          where: { id: booking_id },
        });
        if (booking) {
          if (booking.paymentStatus !== 'UNPAID') {
            throw new BadRequestException(
              'Cannot cancel a paid or half-paid booking recursively',
            );
          }
          await prisma.lawnHoldings.deleteMany({
            where: { lawnId: booking.lawnId, holdBy: membership_no },
          });
          await prisma.lawnBooking.update({
            where: { id: booking_id },
            data: { isCancelled: true },
          });
        }
      } else if (booking_type === 'PHOTOSHOOT') {
        const booking = await prisma.photoshootBooking.findUnique({
          where: { id: booking_id },
        });
        if (booking) {
          if (booking.paymentStatus !== 'UNPAID') {
            throw new BadRequestException(
              'Cannot cancel a paid or half-paid booking recursively',
            );
          }
          await prisma.photoshootBooking.update({
            where: { id: booking_id },
            data: { isCancelled: true },
          });
        }
      }

      return {
        success: true,
        message: 'Unpaid booking and voucher marked as cancelled successfully',
      };
    });
  }

  private attachActiveCancellationRequest(booking: any) {
    if (!booking.cancellationRequests || booking.cancellationRequests.length === 0) {
      return { ...booking, cancellationRequest: null };
    }

    // Sort by createdAt descending to get the latest
    const requests = [...booking.cancellationRequests].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Prefer PENDING request if exists
    const activeRequest = requests.find(r => r.status === 'PENDING') || requests[0];

    return {
      ...booking,
      cancellationRequest: activeRequest,
    };
  }

  private calculateRefund(
    bookingType: 'ROOM' | 'HALL' | 'LAWN' | 'PHOTOSHOOT',
    totalPrice: number,
    paidAmount: number,
    checkIn: Date, // or bookingDate
    requestCreatedAt: Date,
    roomCount: number = 1,
  ): { refundAmount: number; deductionAmount: number } {
    const policyKey =
      bookingType === 'ROOM'
        ? 'roomBooking'
        : bookingType === 'HALL'
          ? 'hallBooking'
          : bookingType === 'LAWN'
            ? 'lawnBooking'
            : 'photoshootBooking';

    const policySection = (paymentPolicies as any)[policyKey];
    if (!policySection || !policySection.cancellationRefund) {
      // Default: no deduction if no policy defined, refund everything paid
      return { refundAmount: paidAmount, deductionAmount: 0 };
    }

    const diffMs = checkIn.getTime() - requestCreatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let bracket = '1-2';
    if (bookingType === 'ROOM') {
      if (roomCount >= 3 && roomCount <= 5) bracket = '3-5';
      else if (roomCount >= 6) bracket = '6-8';
    }

    let timeBracket: 'moreThan72Hours' | '24To72Hours' | 'lessThan24Hours' =
      'lessThan24Hours';
    if (diffHours > 72) timeBracket = 'moreThan72Hours';
    else if (diffHours >= 24) timeBracket = '24To72Hours';

    const policy = policySection.cancellationRefund[timeBracket][bracket];
    const deductionRate = policy?.deduction ?? 1.0;

    const deductionAmount = totalPrice * deductionRate;
    const refundAmount = Math.max(0, paidAmount - deductionAmount);

    return { refundAmount, deductionAmount };
  }

  private async createRefundVoucher(
    bookingId: number,
    bookingType: BookingType,
    membershipNo: string,
    amount: number,
    remarks: string,
  ) {
    const vno = generateNumericVoucherNo();
    return await this.prismaService.paymentVoucher.create({
      data: {
        consumer_number: generateConsumerNumber(Number(vno)),
        voucher_no: vno,
        booking_id: bookingId,
        booking_type: bookingType,
        membership_no: membershipNo,
        amount: amount,
        voucher_type: VoucherType.REFUND,
        status: VoucherStatus.CONFIRMED,
        issued_by: 'System',
        paid_at: new Date(),
        remarks: remarks,
      } as any,
    });
  }

  private async createToBillVoucher(
    bookingId: number,
    bookingType: BookingType,
    membershipNo: string,
    amount: number,
    remarks: string,
  ) {
    const vno = generateNumericVoucherNo();
    return await this.prismaService.paymentVoucher.create({
      data: {
        consumer_number: generateConsumerNumber(Number(vno)),
        voucher_no: vno,
        booking_id: bookingId,
        booking_type: bookingType,
        membership_no: membershipNo,
        amount: amount,
        voucher_type: VoucherType.TO_BILL,
        status: VoucherStatus.CONFIRMED,
        issued_by: 'System',
        paid_at: new Date(),
        remarks: remarks,
      } as any,
    });
  }
}

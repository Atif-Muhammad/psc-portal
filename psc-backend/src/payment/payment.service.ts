import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BookingType,
  PaidBy,
  PaymentMode,
  VoucherStatus,
  VoucherType,
  Channel,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  formatPakistanDate,
  getPakistanDate,
  parsePakistanDate,
} from 'src/utils/time';
import { generateNumericVoucherNo } from 'src/utils/id';
import { BookingService } from 'src/booking/booking.service';
import {
  BillInquiryResponse,
  BillPaymentRequestDto,
  BillPaymentResponse,
} from './dtos/kuickpay.dto';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { MailerService } from 'src/mailer/mailer.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  constructor(
    private prismaService: PrismaService,
    private bookingService: BookingService,
    private realtimeGateway: RealtimeGateway,
    private notificationService: NotificationService,
    private mailerService: MailerService,
  ) {}

  // Kuickpay Integration Logic

  async getBillInquiry(voucherId: number): Promise<BillInquiryResponse> {
    const voucher = await this.prismaService.paymentVoucher.findUnique({
      where: { id: voucherId },
      include: {
        member: true,
      },
    });

    if (!voucher) {
      return {
        response_Code: '01',
        consumer_Detail: ''.padEnd(30, ' '),
        bill_status: 'B',
        due_date: ' ',
        amount_within_dueDate: this.formatAmountForKuickpay(0, 13, true),
        amount_after_dueDate: this.formatAmountForKuickpay(0, 13, true),
        email_address: ' ',
        contact_number: ' ',
        billing_month: ' ',
        date_paid: ' ',
        amount_paid: ' ',
        tran_auth_Id: ' ',
        reserved: ' ',
      } as any;
    }

    const bookingDate = voucher.issued_at;
    const billingMonth = `${bookingDate.getFullYear().toString().slice(-2)}${(bookingDate.getMonth() + 1).toString().padStart(2, '0')}`;

    let billStatus: 'U' | 'P' | 'B' | 'T' = 'U';
    if (voucher.status === VoucherStatus.CONFIRMED) billStatus = 'P';
    else if (voucher.status === VoucherStatus.CANCELLED) billStatus = 'B';

    const amountStr = this.formatAmountForKuickpay(
      Number(voucher.amount),
      13,
      true,
    );

    return {
      response_Code: '00',
      consumer_Detail: (voucher.member?.Name || 'N/A')
        .toUpperCase()
        .slice(0, 30)
        .padEnd(30, ' '),
      bill_status: billStatus,
      due_date: this.formatDateToYYYYMMDD(
        voucher.expiresAt || voucher.issued_at,
      ),
      amount_within_dueDate: amountStr,
      amount_after_dueDate: amountStr,
      email_address: (voucher.member?.Email || 'N/A').slice(0, 30),
      contact_number: (voucher.member?.Contact_No || 'N/A').slice(0, 15),
      billing_month: billingMonth,
      date_paid:
        voucher.status === VoucherStatus.CONFIRMED
          ? this.formatDateToYYYYMMDD(voucher.issued_at)
          : '',
      amount_paid:
        voucher.status === VoucherStatus.CONFIRMED
          ? this.formatAmountForKuickpay(Number(voucher.amount), 12, false)
          : '',
      tran_auth_Id:
        voucher.status === VoucherStatus.CONFIRMED
          ? (voucher.transaction_id || '000000').slice(0, 6)
          : '',
      reserved: '',
    };
  }

  async processBillPayment(
    paymentData: BillPaymentRequestDto,
  ): Promise<BillPaymentResponse> {
    const voucherId = parseInt(
      paymentData.consumer_number.slice(
        process.env.KUICKPAY_PREFIX?.length || 5,
      ),
    );

    return await this.prismaService.$transaction(async (prisma) => {
      const voucher = await prisma.paymentVoucher.findUnique({
        where: { id: voucherId },
        include: { member: true },
      });

      if (!voucher) {
        return {
          response_Code: '01',
          Identification_parameter: '',
          reserved: '',
        };
      }

      if (voucher.status === VoucherStatus.CONFIRMED) {
        // Check if it's the same transaction (idempotency)
        if (voucher.transaction_id === paymentData.tran_auth_id) {
          return {
            response_Code: '00',
            Identification_parameter:
              voucher.member?.Email || voucher.voucher_no,
            reserved: 'Duplicate success',
          };
        }
        return {
          response_Code: '03',
          Identification_parameter: '',
          reserved: 'Already paid',
        };
      }

      if (voucher.status === VoucherStatus.CANCELLED) {
        return {
          response_Code: '02',
          Identification_parameter: '',
          reserved: 'Voucher cancelled',
        };
      }

      // Update voucher
      await prisma.paymentVoucher.update({
        where: { id: voucherId },
        data: {
          status: VoucherStatus.CONFIRMED,
          transaction_id: paymentData.tran_auth_id,
          payment_mode: PaymentMode.ONLINE,
          channel: Channel.KUICKPAY,
          gateway_meta: paymentData as any,
          invoice_no: paymentData.tran_auth_id, // Using auth id as invoice no for now
        },
      });

      // Update Booking
      const bType = voucher.booking_type;
      const bId = voucher.booking_id;

      if (bType === 'ROOM') {
        const booking = await prisma.roomBooking.update({
          where: { id: bId },
          data: {
            paymentStatus: 'PAID',
            paidAmount: voucher.amount,
            pendingAmount: 0,
            isConfirmed: true,
          },
          include: { rooms: true },
        });
        const roomIds = booking.rooms.map((r) => r.roomId);
        await prisma.roomHoldings.deleteMany({
          where: { roomId: { in: roomIds }, holdBy: voucher.membership_no },
        });
      } else if (bType === 'HALL') {
        const booking = await prisma.hallBooking.update({
          where: { id: bId },
          data: {
            paymentStatus: 'PAID',
            paidAmount: voucher.amount,
            pendingAmount: 0,
            isConfirmed: true,
          },
        });
        await prisma.hallHoldings.deleteMany({
          where: { hallId: booking.hallId, holdBy: voucher.membership_no },
        });
      } else if (bType === 'LAWN') {
        const booking = await prisma.lawnBooking.update({
          where: { id: bId },
          data: {
            paymentStatus: 'PAID',
            paidAmount: voucher.amount,
            pendingAmount: 0,
            isConfirmed: true,
          },
        });
        await prisma.lawnHoldings.deleteMany({
          where: { lawnId: booking.lawnId, holdBy: voucher.membership_no },
        });
      } else if (bType === 'PHOTOSHOOT') {
        await prisma.photoshootBooking.update({
          where: { id: bId },
          data: {
            paymentStatus: 'PAID',
            paidAmount: voucher.amount,
            pendingAmount: 0,
            isConfirmed: true,
          },
        });
      }

      // Update Member Ledger
      const paidAmount = Number(voucher.amount);
      await prisma.member.update({
        where: { Membership_No: voucher.membership_no },
        data: {
          bookingAmountPaid: { increment: Math.round(paidAmount) },
          bookingAmountDue: { decrement: Math.round(paidAmount) },
          bookingBalance: { increment: Math.round(paidAmount) },
          lastBookingDate: getPakistanDate(),
        },
      });

      const response = {
        response_Code: '00',
        Identification_parameter: voucher.member?.Email || voucher.voucher_no,
        reserved: '',
      };

      // Trigger asynchronous notifications after transaction success
      this.triggerNotifications(voucher, paymentData).catch((err) =>
        console.error('Failed to trigger notifications:', err),
      );

      return response;
    });
  }

  private async triggerNotifications(
    voucher: any,
    paymentData: BillPaymentRequestDto,
  ) {
    const voucherId = voucher.id;
    const email = voucher.member?.Email;
    const name = voucher.member?.Name || 'Member';
    const amount = Number(voucher.amount);

    // 1. Real-time update
    this.realtimeGateway.emitPaymentUpdate(voucherId, 'PAID', {
      amount,
      transactionId: paymentData.tran_auth_id,
    });

    // 2. Mobile Notification
    try {
      const noti = await this.notificationService.createNoti(
        {
          title: 'Payment Successful',
          description: `Your payment of Rs. ${amount} for ${voucher.booking_type} booking has been received.`,
        },
        'SYSTEM',
      );

      if (email) {
        this.notificationService.enqueue({
          id: uuidv4(),
          status: 'PENDING',
          noti_created: noti.id,
          recipient: email,
        });
      }
    } catch (err) {
      console.error('Mobile notification failed:', err);
    }

    // 3. Email Notification
    if (email) {
      try {
        const subject = `Payment Confirmation - PSC`;
        const body = `
          <h3>Dear ${name},</h3>
          <p>This is to confirm that your payment for <b>${voucher.booking_type}</b> booking has been successfully processed.</p>
          <ul>
            <li><b>Voucher No:</b> ${voucher.voucher_no}</li>
            <li><b>Amount:</b> Rs. ${amount}</li>
            <li><b>Transaction ID:</b> ${paymentData.tran_auth_id}</li>
            <li><b>Date:</b> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Thank you for using our services.</p>
          <br/>
          <p>Best Regards,<br/>PSC Team</p>
        `;
        await this.mailerService.sendMail(email, [], subject, body);
      } catch (err) {
        console.error('Email notification failed:', err);
      }
    }
  }

  formatAmountForKuickpay(
    amount: number,
    length: number,
    includeSign: boolean,
  ): string {
    const sign = amount >= 0 ? '+' : '-';
    const absoluteAmount = Math.abs(amount);
    // Use whole units as requested by user, padded to length
    const padded = Math.round(absoluteAmount).toString().padStart(length, '0');
    return includeSign ? sign + padded : padded;
  }

  formatDateToYYYYMMDD(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  parseKuickpayDate(dateString: string): Date {
    // YYYYMMDD
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));
    return new Date(year, month, day);
  }

  // kuick pay
  // Mock payment gateway call - replace with actual integration
  private async callPaymentGateway(paymentData: any) {
    // Simulate API call to payment gateway

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
          include: { rooms: true },
        });
        membershipNo = booking.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'HALL') {
        booking = await prisma.hallBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true },
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'LAWN') {
        booking = await prisma.lawnBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true },
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      } else if (bookingType === 'PHOTOSHOOT') {
        booking = await prisma.photoshootBooking.update({
          where: { id },
          data: { isConfirmed: true, paymentStatus: 'PAID' },
          include: { member: true },
        });
        membershipNo = booking.member.Membership_No;
        totalAmount = Number(booking.totalPrice);
      }
      // Add more types as needed...

      // 2. Update Voucher
      await prisma.paymentVoucher.updateMany({
        where: {
          booking_id: id,
          booking_type: bookingType,
          status: VoucherStatus.PENDING,
        },
        data: { status: VoucherStatus.CONFIRMED },
      });

      // 3. Clear Holdings
      if (bookingType === 'ROOM') {
        const roomIds = booking.rooms.map((r) => r.roomId);
        await prisma.roomHoldings.deleteMany({
          where: { roomId: { in: roomIds }, holdBy: membershipNo },
        });
      } else if (bookingType === 'HALL') {
        await prisma.hallHoldings.deleteMany({
          where: { hallId: booking.hallId, holdBy: membershipNo },
        });
      } else if (bookingType === 'LAWN') {
        await prisma.lawnHoldings.deleteMany({
          where: { lawnId: booking.lawnId, holdBy: membershipNo },
        });
      }

      // 4. Update Member Ledger (Mimicking ledger updates in BookingService)
      // Note: This logic should ideally be shared or called from BookingService
      const member = await prisma.member.findUnique({
        where: { Membership_No: membershipNo },
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
        throw new BadRequestException(
          `Unsupported or invalid booking type: ${type}`,
        );
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
    const voucher_no = generateNumericVoucherNo();
    return await this.prismaService.paymentVoucher.create({
      data: {
        voucher_no,
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
      where: { Membership_No: bookingData.membership_no },
    });
    if (member?.Status !== 'active')
      throw new UnprocessableEntityException(`Cannot book for inactive member`);
    // Validate room type exists
    const typeExists = await this.prismaService.roomType.findFirst({
      where: { id: roomType },
    });
    if (!typeExists) throw new NotFoundException(`Room type not found`);
    // Parse dates
    const checkIn = parsePakistanDate(bookingData.from);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = parsePakistanDate(bookingData.to);
    checkOut.setHours(0, 0, 0, 0);

    // Validate dates
    if (checkIn >= checkOut) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const today = getPakistanDate();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
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
            },
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
      include: {
        roomType: {
          select: {
            priceMember: true,
            priceGuest: true,
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
          create: selectedRooms.map((r) => ({
            roomId: r.id,
            priceAtBooking:
              bookingData?.pricingType === 'member'
                ? r.roomType?.priceMember
                : r.roomType?.priceGuest,
          })),
        },
      },
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'ROOM',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: 'FULL_PAYMENT',
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Room booking: ${selectedRooms.map((room) => room.roomNumber).join(', ')} from ${bookingData.from} to ${bookingData.to}`,
      expiresAt: holdExpiry,
    });

    // return voucher details
    if (voucher) {
      const prefix = process.env.KUICKPAY_PREFIX || '01520';
      return {
        issue_date: voucher.issued_at,
        due_date: voucher.expiresAt,
        membership: {
          no: member?.Membership_No,
          name: member?.Name,
          email: member?.Email,
          contact: member?.Contact_No,
        },
        voucher: {
          ...voucher,
          consumer_number: `${prefix}${voucher.id.toString().padStart(13, '0')}`,
        },
      };
    }
    throw new HttpException('Failed to create voucher', 500);
  }

  async genInvoiceHall(hallId: number, bookingData: any) {
    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no },
    });
    if (member?.Status !== 'active')
      throw new UnprocessableEntityException(`Cannot book for inactive member`);

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
    const booking = parsePakistanDate(bookingData.bookingDate);
    booking.setHours(0, 0, 0, 0);

    const today = getPakistanDate();
    today.setHours(0, 0, 0, 0);

    if (booking < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    // Resolve End Date
    const endDate = bookingData.endDate
      ? parsePakistanDate(bookingData.endDate)
      : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    // Calculate number of days (inclusive)
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── 4. VALIDATE EVENT TIME SLOT ─────────────────────────
    const normalizedEventTime = (
      bookingData.eventTime || 'EVENING'
    ).toUpperCase() as 'MORNING' | 'EVENING' | 'NIGHT';
    const validEventTimes = ['MORNING', 'EVENING', 'NIGHT'];

    if (!validEventTimes.includes(normalizedEventTime)) {
      throw new BadRequestException(
        'Invalid event time. Must be MORNING, EVENING, or NIGHT',
      );
    }

    // ── BOOKING DETAILS NORMALIZATION ──
    const bookingDetails = bookingData.bookingDetails || [];
    const normalizedDetails: {
      date: Date;
      timeSlot: string;
      eventType?: string;
    }[] = [];

    if (bookingDetails && bookingDetails.length > 0) {
      for (const detail of bookingDetails) {
        const dDate = parsePakistanDate(detail.date);
        dDate.setHours(0, 0, 0, 0);
        normalizedDetails.push({
          date: dDate,
          timeSlot: detail.timeSlot,
          eventType: detail.eventType || bookingData.eventType,
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
          eventType: bookingData.eventType,
        });
      }
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

    // ── 6. CONFLICT CHECKS (Granular) ─────────────────────────
    for (const detail of normalizedDetails) {
      const currentCheckDate = detail.date;
      const currentSlot = detail.timeSlot;

      // 1. Check Out of Order
      const outOfOrderConflict = hallExists.outOfOrders?.find((period) => {
        const pStart = new Date(period.startDate).setHours(0, 0, 0, 0);
        const pEnd = new Date(period.endDate).setHours(0, 0, 0, 0);
        return (
          currentCheckDate.getTime() >= pStart &&
          currentCheckDate.getTime() <= pEnd
        );
      });

      if (outOfOrderConflict) {
        throw new ConflictException(
          `Hall '${hallExists.name}' out of order on ${currentCheckDate.toLocaleDateString()}`,
        );
      }

      // 2. Check Existing Bookings
      const existingBooking = await this.prismaService.hallBooking.findFirst({
        where: {
          hallId: hallExists.id,
          bookingDate: { lte: currentCheckDate },
          endDate: { gte: currentCheckDate },
          isCancelled: false,
        },
      });

      if (existingBooking) {
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

        if (hasConflict) {
          throw new ConflictException(
            `Hall already booked for ${currentSlot} on ${currentCheckDate.toLocaleDateString()}`,
          );
        }
      }

      // 3. Check Reservations
      const dayStart = new Date(currentCheckDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentCheckDate);
      dayEnd.setHours(23, 59, 59, 999);

      const reservation = await this.prismaService.hallReservation.findFirst({
        where: {
          hallId: hallExists.id,
          reservedFrom: { lte: dayEnd },
          reservedTo: { gte: dayStart },
          timeSlot: currentSlot,
        },
      });

      if (reservation) {
        throw new ConflictException(
          `Hall reserved for ${currentSlot} on ${currentCheckDate.toLocaleDateString()}`,
        );
      }
    }

    // ── 7. CALCULATE TOTAL PRICE ────────────────────────────
    const basePrice =
      bookingData.pricingType === 'member'
        ? hallExists.chargesMembers
        : hallExists.chargesGuests;
    const totalPrice = bookingData.totalPrice
      ? Number(bookingData.totalPrice)
      : Number(basePrice) * normalizedDetails.length;

    // ── 8. CALCULATE HOLD EXPIRY ───────────────────────────
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for refined flow

    // ── 9. PUT HALL ON HOLD ────────────────────────────────
    try {
      await this.prismaService.hallHoldings.create({
        data: {
          hallId: hallExists.id,
          onHold: true,
          holdExpiry: holdExpiry,
          holdBy: String(bookingData.membership_no),
          fromDate: booking,
          toDate: endDate,
          timeSlot: normalizedEventTime,
        },
      });
    } catch (holdError) {
      // Skip error if record exists or just proceed
    }

    // create temporary(unconfirmed) booking
    const bookingCreated = await this.prismaService.hallBooking.create({
      data: {
        memberId: member.Sno,
        hallId: hallExists.id,
        bookingDate: booking,
        endDate: endDate,
        numberOfDays: numberOfDays,
        bookingDetails: normalizedDetails,
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
      },
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'HALL',
      booking_id: bookingCreated.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: 'FULL_PAYMENT',
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Hall booking: ${hallExists.name} on ${booking.toLocaleDateString()}${endDate && endDate > booking ? ` to ${endDate.toLocaleDateString()}` : ''}`,
      expiresAt: holdExpiry,
    });

    // return voucher details
    if (voucher) {
      const prefix = process.env.KUICKPAY_PREFIX || '01520';
      return {
        issue_date: voucher.issued_at,
        due_date: voucher.expiresAt,
        membership: {
          no: member?.Membership_No,
          name: member?.Name,
          email: member?.Email,
          contact: member?.Contact_No,
        },
        voucher: {
          ...voucher,
          consumer_number: `${prefix}${voucher.id.toString().padStart(13, '0')}`,
        },
      };
    }
    throw new HttpException('Failed to create voucher', 500);
  }

  async genInvoiceLawn(lawnId: number, bookingData: any) {
    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no },
    });
    if (member?.Status !== 'active')
      throw new UnprocessableEntityException(`Cannot book for inactive member`);

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
    const booking = parsePakistanDate(bookingData.bookingDate);
    booking.setHours(0, 0, 0, 0);

    const today = getPakistanDate();
    today.setHours(0, 0, 0, 0);

    if (booking < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    // Resolve End Date
    const endDate = bookingData.endDate
      ? parsePakistanDate(bookingData.endDate)
      : new Date(booking);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < booking) {
      throw new BadRequestException('End Date cannot be before Start Date');
    }

    // Calculate number of days (inclusive)
    const diffTime = Math.abs(endDate.getTime() - booking.getTime());
    const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ── 4. VALIDATE EVENT TIME SLOT ─────────────────────────
    const normalizedEventTime = (
      bookingData.eventTime || 'NIGHT'
    ).toUpperCase() as 'MORNING' | 'EVENING' | 'NIGHT';
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
      if (activeHold.holdBy !== bookingData.membership_no?.toString()) {
        throw new ConflictException(
          `Lawn '${lawnExists.description}' is currently on hold by another user`,
        );
      }
    }

    // ── 7. CONFLICT CHECKS (Granular) ─────────────────────────
    for (let i = 0; i < numberOfDays; i++) {
      const currentCheckDate = new Date(booking);
      currentCheckDate.setDate(booking.getDate() + i);
      currentCheckDate.setHours(0, 0, 0, 0);

      // 1. Out of Order
      const outOfOrderConflict = lawnExists.outOfOrders?.find((period) => {
        const start = new Date(period.startDate).setHours(0, 0, 0, 0);
        const end = new Date(period.endDate).setHours(0, 0, 0, 0);
        return (
          currentCheckDate.getTime() >= start &&
          currentCheckDate.getTime() <= end
        );
      });
      if (outOfOrderConflict)
        throw new ConflictException(
          `Lawn out of order on ${currentCheckDate.toLocaleDateString()}`,
        );

      // 2. Existing Bookings
      const confBooking = await this.prismaService.lawnBooking.findFirst({
        where: {
          lawnId: lawnExists.id,
          bookingDate: { lte: currentCheckDate },
          endDate: { gte: currentCheckDate },
          bookingTime: normalizedEventTime as any,
          isCancelled: false,
        },
      });
      if (confBooking)
        throw new ConflictException(
          `Lawn already booked for ${normalizedEventTime} on ${currentCheckDate.toLocaleDateString()}`,
        );

      // 3. Reservations
      const dayStart = new Date(currentCheckDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentCheckDate);
      dayEnd.setHours(23, 59, 59, 999);
      const reservation = await this.prismaService.lawnReservation.findFirst({
        where: {
          lawnId: lawnExists.id,
          timeSlot: normalizedEventTime,
          reservedFrom: { lte: dayEnd },
          reservedTo: { gte: dayStart },
        },
      });
      if (reservation)
        throw new ConflictException(
          `Lawn reserved for ${normalizedEventTime} on ${currentCheckDate.toLocaleDateString()}`,
        );
    }

    // ── 8. CHECK GUEST COUNT AGAINST CAPACITY ───────────────
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

    // ── 9. CALCULATE TOTAL PRICE ───────────────────────────
    const basePrice =
      bookingData.pricingType === 'member'
        ? lawnExists.memberCharges
        : lawnExists.guestCharges;
    const slotsCount =
      (bookingData.bookingDetails as any[])?.length || numberOfDays;
    const totalPrice = bookingData.totalPrice
      ? Number(bookingData.totalPrice)
      : Number(basePrice) * slotsCount;

    // ── 10. CALCULATE HOLD EXPIRY ───────────────────────────
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // create temporary(unconfirmed) booking
    const bookingCreated = await this.prismaService.lawnBooking.create({
      data: {
        memberId: member.Sno,
        lawnId: lawnExists.id,
        bookingDate: booking,
        endDate: endDate,
        numberOfDays: numberOfDays,
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
        bookingTime: normalizedEventTime,
        bookingDetails: bookingData.bookingDetails || [],
      },
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'LAWN',
      booking_id: bookingCreated.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: 'FULL_PAYMENT',
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Lawn booking: ${lawnExists.description} on ${booking.toLocaleDateString()}${endDate && endDate > booking ? ` to ${endDate.toLocaleDateString()}` : ''}`,
      expiresAt: holdExpiry,
    });

    // return voucher details
    if (voucher) {
      const prefix = process.env.KUICKPAY_PREFIX || '01520';
      return {
        issue_date: voucher.issued_at,
        due_date: voucher.expiresAt,
        membership: {
          no: member?.Membership_No,
          name: member?.Name,
          email: member?.Email,
          contact: member?.Contact_No,
        },
        voucher: {
          ...voucher,
          consumer_number: `${prefix}${voucher.id.toString().padStart(13, '0')}`,
        },
      };
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
    console.log('Photoshoot booking data received:', bookingData);
    // check if member is active
    const member = await this.prismaService.member.findFirst({
      where: { Membership_No: bookingData.membership_no },
    });
    if (member?.Status !== 'active')
      throw new UnprocessableEntityException(`Cannot book for inactive member`);

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
    // ── 4. PARSE AND VALIDATE BOOKING DATE & TIME ───────────
    let timeSlotStr = bookingData.timeSlot;
    // Sanitize timeSlot if it has non-standard trailing colons (e.g., :00:00)
    const timeParts = timeSlotStr.split('T');
    if (timeParts.length === 2) {
      const hms = timeParts[1].split(':');
      if (hms.length > 3) {
        timeSlotStr = `${timeParts[0]}T${hms.slice(0, 3).join(':')}`;
      }
    }

    const startTime = new Date(timeSlotStr);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid time slot format');
    }

    const bookingDate = new Date(startTime);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    const now = new Date();
    // Allow 1 min grace for "now" bookings as per cBookingPhotoshoot
    if (startTime.getTime() < now.getTime() - 60000) {
      const bookingDateOnly = new Date(startTime);
      bookingDateOnly.setHours(0, 0, 0, 0);
      const todayDateOnly = new Date(now);
      todayDateOnly.setHours(0, 0, 0, 0);

      if (bookingDateOnly < todayDateOnly) {
        throw new BadRequestException('Booking date cannot be in the past');
      }
      // If same day, allow minor past time (admin-like behavior)
    }

    // Validate time slot is between 9am and 6pm
    const bookingHour = startTime.getHours();
    if (bookingHour < 9 || bookingHour > 18) {
      throw new BadRequestException(
        'Photoshoot bookings are only available between 9:00 AM and 6:00 PM',
      );
    }

    // ── 5. CALCULATE END TIME ───────────────────────────────
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    // REMOVED: Existing booking check to allow same date/time

    // ── 6. CALCULATE TOTAL PRICE ────────────────────────────
    let parsedDetails = bookingData.bookingDetails;
    if (typeof parsedDetails === 'string') {
      try {
        parsedDetails = JSON.parse(parsedDetails);
      } catch (e) {
        parsedDetails = [];
      }
    }
    const slotsCount = Array.isArray(parsedDetails) ? parsedDetails.length : 1;

    const basePrice =
      bookingData.pricingType === 'member'
        ? photoshootExists.memberCharges
        : photoshootExists.guestCharges;
    const totalPrice = bookingData.totalPrice
      ? Number(bookingData.totalPrice)
      : Number(basePrice) * slotsCount;

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
        bookingDetails: parsedDetails || [],
      },
    });

    // create voucher as unpaid/pending
    const voucher = await this.createVoucher({
      booking_type: 'PHOTOSHOOT',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: totalPrice,
      payment_mode: 'ONLINE',
      voucher_type: 'FULL_PAYMENT',
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Photoshoot booking: ${photoshootExists.description} on ${bookingDate.toLocaleDateString()}`,
      expiresAt: holdExpiry,
    });

    // return voucher details
    if (voucher) {
      const prefix = process.env.KUICKPAY_PREFIX || '01520';
      return {
        issue_date: voucher.issued_at,
        due_date: voucher.expiresAt,
        membership: {
          no: member?.Membership_No,
          name: member?.Name,
          email: member?.Email,
          contact: member?.Contact_No,
        },
        voucher: {
          ...voucher,
          consumer_number: `${prefix}${voucher.id.toString().padStart(13, '0')}`,
        },
      };
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
  async checkIdempo(idempotencyKey: string) {}
}

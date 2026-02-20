import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BookingType,
  PaidBy,
  PaymentMode,
  VoucherStatus,
  VoucherType,
  Channel,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  formatPakistanDate,
  getPakistanDate,
  parsePakistanDate,
} from 'src/utils/time';
import { generateNumericVoucherNo, generateConsumerNumber } from 'src/utils/id';
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
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PaymentService {
  private paymentPolicies: any = null;

  constructor(
    private prismaService: PrismaService,
    private bookingService: BookingService,
    private realtimeGateway: RealtimeGateway,
    private notificationService: NotificationService,
    private mailerService: MailerService,
  ) { }

  // Payment Policy Helpers
  private loadPaymentPolicies() {
    if (this.paymentPolicies) {
      return this.paymentPolicies;
    }

    try {
      const configPath = path.join(__dirname, '..', 'common', 'config', 'payment-policies.json');
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      this.paymentPolicies = JSON.parse(fileContent);
      return this.paymentPolicies;
    } catch (error) {
      console.error('Failed to load payment policies:', error);
      // Return default policies if file is not found
      return {
        roomBooking: {
          advancePayment: {
            '1-2': 0.25,
            '3-5': 0.50,
            '6-8': 0.75,
          },
          cancellationRefund: {
            moreThan72Hours: {
              '1-2': { deduction: 0.05 },
              '3-5': { deduction: 0.15 },
              '6-8': { deduction: 0.25 },
            },
            '24To72Hours': {
              '1-2': { deduction: 0.10 },
              '3-5': { deduction: 0.25 },
              '6-8': { deduction: 0.50 },
            },
            lessThan24Hours: {
              '1-2': { deduction: 1.00 },
              '3-5': { deduction: 1.00 },
              '6-8': { deduction: 1.00 },
            },
          },
        },
      };
    }
  }

  private calculateAdvancePayment(totalPrice: number, numberOfRooms: number): { amount: number; percentage: number } {
    const policies = this.loadPaymentPolicies();
    const advancePolicy = policies.roomBooking.advancePayment;

    let percentage = 0.25; // default

    if (numberOfRooms >= 1 && numberOfRooms <= 2) {
      percentage = advancePolicy['1-2'];
    } else if (numberOfRooms >= 3 && numberOfRooms <= 5) {
      percentage = advancePolicy['3-5'];
    } else if (numberOfRooms >= 6 && numberOfRooms <= 8) {
      percentage = advancePolicy['6-8'];
    }

    return {
      amount: Math.round(totalPrice * percentage),
      percentage: percentage * 100,
    };
  }

  private getHoursUntilCheckIn(checkInDate: Date, currentDate: Date = new Date()): number {
    const diffMs = checkInDate.getTime() - currentDate.getTime();
    return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
  }

  private calculateRefundAmount(
    paidAmount: number,
    totalPrice: number,
    numberOfRooms: number,
    checkInDate: Date,
    cancellationDate: Date = new Date(),
  ): { refundAmount: number; deductionPercentage: number } {
    const policies = this.loadPaymentPolicies();
    const hoursUntilCheckIn = this.getHoursUntilCheckIn(checkInDate, cancellationDate);

    let roomBracket = '1-2';
    if (numberOfRooms >= 3 && numberOfRooms <= 5) {
      roomBracket = '3-5';
    } else if (numberOfRooms >= 6 && numberOfRooms <= 8) {
      roomBracket = '6-8';
    }

    let deduction = 1.0; // default: no refund

    if (hoursUntilCheckIn >= 72) {
      // More than 72 hours before check-in
      deduction = policies.roomBooking.cancellationRefund.moreThan72Hours[roomBracket].deduction;
    } else if (hoursUntilCheckIn >= 24 && hoursUntilCheckIn < 72) {
      // Between 24-72 hours before check-in
      deduction = policies.roomBooking.cancellationRefund['24To72Hours'][roomBracket].deduction;
    } else {
      // Less than 24 hours before check-in
      deduction = policies.roomBooking.cancellationRefund.lessThan24Hours[roomBracket].deduction;
    }

    const deductionAmount = Math.round(totalPrice * deduction);
    const refundAmount = Math.max(0, paidAmount - deductionAmount);

    return {
      refundAmount,
      deductionPercentage: deduction * 100,
    };
  }

  // Kuickpay Integration Logic

  async getBillInquiry(consumerNumber: string): Promise<BillInquiryResponse> {
    console.log(consumerNumber)
    const voucher = await this.prismaService.paymentVoucher.findUnique({
      where: { consumer_number: consumerNumber },
      include: {
        member: true,
      },
    });

    if (!voucher || voucher.voucher_type === VoucherType.REFUND || voucher.status === VoucherStatus.CANCELLED || voucher.voucher_type === VoucherType.TO_BILL || voucher.voucher_type === VoucherType.ADJUSTMENT) {
      // if (!voucher || voucher.voucher_type === VoucherType.REFUND || voucher.voucher_type === VoucherType.TO_BILL || voucher.voucher_type === VoucherType.ADJUSTMENT) {
      return {
        response_Code: '01',
        consumer_Detail: 'Voucher not found',
      } as any;
    }

    // Check if voucher is a REFUND voucher - should not be payable

    // Check if voucher has expired
    const now = new Date();
    if (voucher.expiresAt && voucher.expiresAt < now && voucher.status === VoucherStatus.PENDING) {
      return {
        response_Code: '02',
        consumer_Detail: 'Voucher has been expired/blocked',
        bill_status: 'B',
      } as any;

    }


    const bookingDate = voucher.issued_at;
    const billingMonth = `${bookingDate.getFullYear().toString().slice(-2)}${(bookingDate.getMonth() + 1).toString().padStart(2, '0')}`;

    let billStatus: 'U' | 'P' | 'B' | 'T' = 'U';
    if (voucher.status === VoucherStatus.CONFIRMED) billStatus = 'P';
    else if (voucher.status === VoucherStatus.CANCELLED as string) billStatus = 'B';

    const amountStr = this.formatAmountForKuickpay(
      Number(voucher.amount),
      13,
      true,
    );

    return billStatus === 'B' ? {
      response_Code: '02',
      consumer_Detail: 'Voucher has been expired/blocked',
      bill_status: 'B',
    } as any : {
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
    return await this.prismaService.$transaction(async (prisma) => {
      const voucher = await prisma.paymentVoucher.findUnique({
        where: { consumer_number: paymentData.consumer_number },
        include: { member: true },
      });

      if (!voucher) {
        return {
          response_Code: '01',
          Identification_parameter: '',
          reserved: 'Voucher not found',
        };
      }


      // Check if voucher has expired
      const now = new Date();
      if (voucher.expiresAt && voucher.expiresAt < now && voucher.status === VoucherStatus.PENDING) {
        return {
          response_Code: '02',
          Identification_parameter: '',
          reserved: 'Voucher expired/blocked',
        };
      }
      // Check if voucher is a REFUND voucher - should not be payable
      if (voucher.voucher_type === VoucherType.REFUND || voucher.status === VoucherStatus.CANCELLED) {
        // if (voucher.voucher_type === VoucherType.REFUND) {
        return {
          response_Code: '01',
          Identification_parameter: '',
          reserved: 'Voucher not found',
        };
      }

      if (voucher.status === VoucherStatus.CONFIRMED) {
        // Check if it's the same transaction (idempotency)
        if (voucher.transaction_id === paymentData.tran_auth_id) {
          return {
            response_Code: '03',
            Identification_parameter:
              voucher.member?.Email || (voucher as any).consumer_number,
            reserved: 'Duplicate ignored',
          };
        }
        return {
          response_Code: '03',
          Identification_parameter: '',
          reserved: 'Already paid',
        };
      }


      // Update voucher
      await prisma.paymentVoucher.update({
        where: { consumer_number: paymentData.consumer_number },
        data: {
          status: VoucherStatus.CONFIRMED,
          transaction_id: paymentData.tran_auth_id,
          payment_mode: PaymentMode.ONLINE,
          channel: Channel.KUICKPAY,
          gateway_meta: paymentData as any,
          paid_at: new Date(),
          invoice_no: paymentData.tran_auth_id, // Using auth id as invoice no for now
        },
      });

      // Update Booking
      const bType = voucher.booking_type;
      const bId = voucher.booking_id;

      const updateCommonBooking = async (prismaTx: any, booking: any, bTypeLabel: string) => {
        const voucherAmount = Number(voucher.amount);
        const currentPaid = Number(booking.paidAmount);
        const total = Number(booking.totalPrice);
        const newPaid = currentPaid + voucherAmount;

        let newStatus = booking.paymentStatus;
        if (newPaid >= total) {
          newStatus = PaymentStatus.PAID;
        } else if (voucher.voucher_type === VoucherType.ADVANCE_PAYMENT) {
          newStatus = PaymentStatus.ADVANCE_PAYMENT;
        } else if (voucher.voucher_type === VoucherType.HALF_PAYMENT) {
          newStatus = PaymentStatus.HALF_PAID;
        }

        const newPending = Math.max(0, total - newPaid);

        const updateData: any = {
          paymentStatus: newStatus,
          paidAmount: newPaid,
          pendingAmount: newPending,
          isConfirmed: true,
        };

        let updatedBooking: any;
        if (bTypeLabel === 'ROOM') {
          updatedBooking = await prismaTx.roomBooking.update({
            where: { id: bId },
            data: updateData,
            include: { rooms: true },
          });
          const roomIds = updatedBooking.rooms.map((r: any) => r.roomId);
          await prismaTx.roomHoldings.deleteMany({
            where: { roomId: { in: roomIds }, holdBy: voucher.membership_no },
          });
        } else if (bTypeLabel === 'HALL') {
          updatedBooking = await prismaTx.hallBooking.update({
            where: { id: bId },
            data: updateData,
          });
          await prismaTx.hallHoldings.deleteMany({
            where: { hallId: updatedBooking.hallId, holdBy: voucher.membership_no },
          });
        } else if (bTypeLabel === 'LAWN') {
          updatedBooking = await prismaTx.lawnBooking.update({
            where: { id: bId },
            data: updateData,
          });
          await prismaTx.lawnHoldings.deleteMany({
            where: { lawnId: updatedBooking.lawnId, holdBy: voucher.membership_no },
          });
        } else if (bTypeLabel === 'PHOTOSHOOT') {
          updatedBooking = await prismaTx.photoshootBooking.update({
            where: { id: bId },
            data: updateData,
          });
        }
      };

      if (bType === 'ROOM') {
        const booking = await prisma.roomBooking.findUnique({
          where: { id: bId },
        });
        if (booking) await updateCommonBooking(prisma, booking, 'ROOM');
      } else if (bType === 'HALL') {
        const booking = await prisma.hallBooking.findUnique({
          where: { id: bId },
        });
        if (booking) await updateCommonBooking(prisma, booking, 'HALL');
      } else if (bType === 'LAWN') {
        const booking = await prisma.lawnBooking.findUnique({
          where: { id: bId },
        });
        if (booking) await updateCommonBooking(prisma, booking, 'LAWN');
      } else if (bType === 'PHOTOSHOOT') {
        const booking = await prisma.photoshootBooking.findUnique({
          where: { id: bId },
        });
        if (booking) await updateCommonBooking(prisma, booking, 'PHOTOSHOOT');
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
        Identification_parameter: (voucher as any).member?.Email || (voucher as any).consumer_number,
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
    const consumer_number = voucher.consumer_number;
    const email = voucher.member?.Email;
    const name = voucher.member?.Name || 'Member';
    const amount = Number(voucher.amount);

    // 1. Real-time update
    this.realtimeGateway.emitPaymentUpdate(voucher?.id, 'PAID', {
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
            <li><b>Consumer No:</b> ${consumer_number}</li>
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
    // Convert rupees to paisa (multiply by 100) and pad to length
    const amountInPaisa = Math.round(absoluteAmount * 100);
    const padded = amountInPaisa.toString().padStart(length, '0');
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
    consumer_number: string;
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
    // const voucher_no = generateNumericVoucherNo();
    return await this.prismaService.paymentVoucher.create({
      data: {
        consumer_number: data.consumer_number,
        // voucher_no,
        booking_type: data.booking_type,
        booking_id: data.booking_id,
        membership_no: data.membership_no,
        amount: data.amount,
        payment_mode: data.payment_mode,
        channel: data.payment_mode === PaymentMode.ONLINE ? Channel.KUICKPAY : Channel.ADMIN_PORTAL,
        voucher_type: data.voucher_type,
        status: data.status || VoucherStatus.PENDING,
        issued_by: data.issued_by || 'system',
        remarks: data.remarks,
        expiresAt: data.expiresAt,
      } as any,
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

    // Check for unpaid online vouchers for ROOM bookings
    const unpaidVouchers = await this.prismaService.paymentVoucher.findMany({
      where: {
        membership_no: bookingData.membership_no,
        status: VoucherStatus.PENDING,
        payment_mode: PaymentMode.ONLINE,
        booking_type: BookingType.ROOM,
        expiresAt: {
          gte: new Date(),
        },
      },
      select: { booking_id: true },
    });

    if (unpaidVouchers.length > 0) {
      // Fetch room bookings for these vouchers to identify their room types
      const bookingsWithRooms = await this.prismaService.roomBooking.findMany({
        where: { id: { in: unpaidVouchers.map((v) => v.booking_id) } },
        select: {
          rooms: {
            select: {
              room: {
                select: { roomTypeId: true },
              },
            },
          },
        },
      });

      const existingRoomTypeIds = new Set(
        bookingsWithRooms.flatMap((b) => b.rooms.map((r) => r.room.roomTypeId)),
      );

      // 1. Don't allow two unpaid online vouchers for a single room type
      if (existingRoomTypeIds.has(roomType)) {
        throw new PreconditionFailedException(
          'An unpaid voucher for this room type already exists. Please clear it before generating a new one.',
        );
      }

      // 2. Combined count for different room types shouldn't exceed 3
      if (existingRoomTypeIds.size >= 3) {
        throw new PreconditionFailedException(
          'You have reached the maximum limit of 3 unpaid vouchers. Please clear existing ones first.',
        );
      }
    }

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
              isCancelled: false,
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


    // Select specific rooms for booking
    const selectedRooms = availableRooms.slice(0, bookingData.numberOfRooms);

    // Calculate expiry time (1 hour from now for refined flow)
    const holdExpiry = new Date(Date.now() + 60 * 60 * 1000);

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

    // Calculate advance payment based on number of rooms
    const advancePaymentCalc = this.calculateAdvancePayment(totalPrice, bookingData.numberOfRooms);
    const advanceAmount = advancePaymentCalc.amount;
    const advancePercentage = advancePaymentCalc.percentage;

    // create voucher as unpaid/pending with advance payment amount
    const vno = generateNumericVoucherNo();
    const voucher = await this.createVoucher({
      consumer_number: generateConsumerNumber(Number(vno)),
      booking_type: 'ROOM',
      booking_id: booking.id,
      membership_no: String(bookingData.membership_no),
      amount: advanceAmount,
      payment_mode: 'ONLINE',
      voucher_type: VoucherType.ADVANCE_PAYMENT,
      status: VoucherStatus.PENDING,
      issued_by: 'system',
      remarks: `Advance payment (${advancePercentage}%) for room booking: ${selectedRooms.map((room) => room.roomNumber).join(', ')} from ${bookingData.from} to ${bookingData.to}. Total: Rs. ${totalPrice}`,
      expiresAt: holdExpiry,
    });

    // return voucher details
    if (voucher) {
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
          consumer_number: voucher.consumer_number,
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
    const vno = generateNumericVoucherNo();
    const voucher = await this.createVoucher({
      consumer_number: generateConsumerNumber(Number(vno)),
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
          consumer_number: voucher.consumer_number,
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
    ).toUpperCase() as 'DAY' | 'NIGHT';
    const validEventTimes = ['DAY', 'NIGHT'];

    if (!validEventTimes.includes(normalizedEventTime)) {
      throw new BadRequestException(
        'Invalid event time. Must be DAY or NIGHT',
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
    const vno = generateNumericVoucherNo();
    const voucher = await this.createVoucher({
      consumer_number: generateConsumerNumber(Number(vno)),
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
          consumer_number: voucher.consumer_number,
        },
      };
    }
    throw new HttpException('Failed to create voucher', 500);
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
    const vno = generateNumericVoucherNo();
    const voucher = await this.createVoucher({
      consumer_number: generateConsumerNumber(Number(vno)),
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
          consumer_number: voucher.consumer_number,
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

  async cleanupExpiredVouchers(membership_no?: string) {
    const now = new Date();

    // Find all pending vouchers that have expired
    const expiredVouchers = await this.prismaService.paymentVoucher.findMany({
      where: {
        status: VoucherStatus.PENDING,
        expiresAt: { lt: now },
        ...(membership_no && { membership_no }),
      },
    });

    if (expiredVouchers.length === 0) return;

    for (const voucher of expiredVouchers) {
      await this.prismaService.$transaction(async (prisma) => {
        // 1. Delete associated booking if it's not confirmed
        if (voucher.booking_type === 'ROOM') {
          await prisma.roomBooking.deleteMany({
            where: { id: voucher.booking_id, isConfirmed: false },
          });
        } else if (voucher.booking_type === 'HALL') {
          await prisma.hallBooking.deleteMany({
            where: { id: voucher.booking_id, isConfirmed: false },
          });
        } else if (voucher.booking_type === 'LAWN') {
          await prisma.lawnBooking.deleteMany({
            where: { id: voucher.booking_id, isConfirmed: false },
          });
        } else if (voucher.booking_type === 'PHOTOSHOOT') {
          await prisma.photoshootBooking.deleteMany({
            where: { id: voucher.booking_id, isConfirmed: false },
          });
        }

        // 2. Delete the voucher itself
        await prisma.paymentVoucher.delete({
          where: { consumer_number: voucher.consumer_number },
        });
      });
    }
  }

  // check idempotency
  async checkIdempo(idempotencyKey: string) { }
}

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { PaymentService } from './payment.service';
import { BookingService } from 'src/booking/booking.service';
import { StatusGuard } from 'src/common/guards/StatusGuard';
import {
  BillInquiryRequestDto,
  BillPaymentRequestDto,
} from './dtos/kuickpay.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private payment: PaymentService,
    private bookingService: BookingService,
  ) { }

  // generate invoice:

  @UseGuards(JwtAccGuard, StatusGuard)
  @Post('generate/invoice/room')
  async generateInvoiceRoom(
    @Query('roomType') roomType: string,
    @Body() bookingData: any,
    @Req() req: { user: { id: string } },
  ) {
    // Prefer membership number coming from the frontend payload; fall back to JWT user id
    const membership_no = bookingData.membership_no ?? req.user?.id;
    return await this.payment.genInvoiceRoom(Number(roomType), {
      ...bookingData,
      membership_no,
    });
  }

  @UseGuards(JwtAccGuard, StatusGuard)
  @Post('generate/invoice/hall')
  async generateInvoiceHall(
    @Query('hallId') hallId: string,
    @Body() bookingData: any,
    @Req() req: { user: { id: string } },
  ) {
    // Prefer membership number coming from the frontend payload; fall back to JWT user id
    const membership_no = bookingData.membership_no ?? req.user?.id;
    return await this.payment.genInvoiceHall(Number(hallId), {
      ...bookingData,
      membership_no,
    });
  }

  @UseGuards(JwtAccGuard, StatusGuard)
  @Post('generate/invoice/lawn')
  async generateInvoiceLawn(
    @Query('lawnId') lawnId: string,
    @Body() bookingData: any,
    @Req() req: { user: { id: string } },
  ) {
    // Prefer membership number coming from the frontend payload; fall back to JWT user id
    const membership_no = bookingData.membership_no ?? req.user?.id;
    return await this.payment.genInvoiceLawn(Number(lawnId), {
      ...bookingData,
      membership_no,
    });
  }
  @UseGuards(JwtAccGuard, StatusGuard)
  @Post('generate/invoice/photoshoot')
  async generateInvoicePhotoshoot(
    @Query('photoshootId') photoshootId: string,
    @Body() bookingData: any,
    @Req() req: { user: { id: string } },
  ) {
    // Prefer membership number coming from the frontend payload; fall back to JWT user id
    const membership_no = bookingData.membership_no ?? req.user?.id;
    return await this.payment.genInvoicePhotoshoot(Number(photoshootId), {
      ...bookingData,
      membership_no,
    });
  }

  ///////////////////////////////////////////////////////////////////////////////

  @Get('member/vouchers')
  async getMemberVouchers(@Query('membershipNo') membershipNo: string) {
    await this.payment.cleanupExpiredVouchers(membershipNo);
    return await this.payment.getMemberVouchers(membershipNo);
  }

  @Get('voucher/booking')
  async getVouchersByBooking(
    @Query('bookingType') bookingType: string,
    @Query('bookingId', new ParseIntPipe({ optional: true }))
    bookingId?: number,
  ) {
    if (!bookingId) {
      throw new HttpException(
        'bookingId query parameter is required and must be an integer',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.bookingService.getVouchersByBooking(
      bookingType,
      bookingId,
    );
  }

  @Post('confirm/:type/:id')
  async confirmBooking(@Param('type') type: string, @Param('id') id: string) {
    return await this.payment.confirmBooking(type, Number(id));
  }

  // Kuickpay Integration Endpoints

  @Post('kuickpay/bill-inquiry')
  async billInquiry(@Body() payload: BillInquiryRequestDto, @Req() req: any) {
    const { username, password } = req.headers;

    if (
      username !== process.env.KUICKPAY_USERNAME ||
      password !== process.env.KUICKPAY_PASSWORD
    ) {
      return {
        response_Code: '04',
        consumer_Detail: 'Invalid credentials'.padEnd(30, ' '),
        bill_status: 'B',
      };
    }

    const prefix = process.env.KUICKPAY_PREFIX || '25430';
    if (!payload.consumer_number.startsWith(prefix)) {
      return {
        response_Code: '01',
        consumer_Detail: 'Voucher not found',
        bill_status: 'B',
      };
    }

    if (isNaN(Number(payload.consumer_number))) {
      return {
        response_Code: '01',
        consumer_Detail: 'Voucher not found',
        bill_status: 'B',
      };
    }

    try {
      // await this.payment.cleanupExpiredVouchers();
      return await this.payment.getBillInquiry(payload.consumer_number);
    } catch (error) {
      console.error('Kuickpay Inquiry Error:', error);
      return {
        response_Code: '05',
        consumer_Detail: 'Service Failed',
        bill_status: 'B',
      };
    }
  }

  @Post('kuickpay/bill-payment')
  async billPayment(@Body() payload: BillPaymentRequestDto, @Req() req: any) {
    const { username, password } = req.headers;

    if (
      username !== process.env.KUICKPAY_USERNAME ||
      password !== process.env.KUICKPAY_PASSWORD
    ) {
      return {
        response_Code: '04',
        Identification_parameter: '',
        reserved: 'Auth failed',
      };
    }

    const prefix = process.env.KUICKPAY_PREFIX || '25430';
    if (!payload.consumer_number.startsWith(prefix)) {
      return {
        response_Code: '01',
        Identification_parameter: '',
        reserved: 'Voucher not found',
      };
    }

    try {
      return await this.payment.processBillPayment(payload);
    } catch (error) {
      console.error('Kuickpay Payment Error:', error);
      return {
        response_Code: '05',
        Identification_parameter: '',
        reserved: 'Internal error',
      };
    }
  }
}

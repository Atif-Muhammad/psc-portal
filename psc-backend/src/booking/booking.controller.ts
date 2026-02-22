import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesEnum } from 'src/common/constants/roles.enum';
import { BookingDto } from './dtos/booking.dto';
import { PaymentMode } from '@prisma/client';
import { ContentService } from 'src/content/content.service';

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly contentService: ContentService,
  ) { }

  @Get('lock')
  async lockBookings() {
    return await this.bookingService.lock();
  }

  @Get('voucher')
  async getVouchers(
    @Query('bookingType') bookingType: string,
    @Query('bookingId', new ParseIntPipe({ optional: true }))
    bookingId?: number,
  ) {
    if (!bookingId) {
      throw new BadRequestException(
        'bookingId is required and must be an integer',
      );
    }
    return await this.bookingService.getVouchersByBooking(
      bookingType,
      bookingId,
    );
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Patch('voucher/update-status')
  async updateVoucherStatus(
    @Body() payload: { voucherId: number; status: string },
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return await this.bookingService.updateVoucherStatus(
      payload.voucherId.toString(),
      payload.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED',
      adminName,
    );
  }

  // booking //

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Post('create/booking')
  async createBooking(@Body() payload: BookingDto, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    // console.log(payload)
    if (payload.category === 'Room')
      return await this.bookingService.cBookingRoom(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Hall')
      return await this.bookingService.cBookingHall(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Lawn')
      return await this.bookingService.cBookingLawn(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Photoshoot')
      return await this.bookingService.cBookingPhotoshoot(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Patch('update/booking')
  async updateBooking(@Body() payload: Partial<BookingDto>, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    if (payload.category === 'Room')
      return await this.bookingService.uBookingRoom(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Hall')
      return await this.bookingService.uBookingHall(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Lawn')
      return await this.bookingService.uBookingLawn(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
    else if (payload.category === 'Photoshoot')
      return await this.bookingService.uBookingPhotoshoot(
        {
          ...payload,
          paymentMode: payload.paymentMode || PaymentMode.CASH,
        },
        adminName,
      );
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Get('get/bookings/all')
  async getBookings(
    @Query('bookingsFor') bookingFor: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (bookingFor === 'rooms')
      return this.bookingService.gBookingsRoom(page, limit);
    if (bookingFor === 'halls')
      return this.bookingService.gBookingsHall(page, limit);
    if (bookingFor === 'lawns')
      return this.bookingService.gBookingsLawn(page, limit);
    if (bookingFor === 'photoshoots')
      return this.bookingService.gBookingPhotoshoot(page, limit);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Get('get/bookings/cancelled')
  async getCancelledBookings(
    @Query('bookingsFor') bookingFor: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (bookingFor === 'rooms')
      return this.bookingService.gCancelledBookingsRoom(page, limit);
    if (bookingFor === 'halls')
      return this.bookingService.gCancelledBookingsHall(page, limit);
    if (bookingFor === 'lawns')
      return this.bookingService.gCancelledBookingsLawn(page, limit);
    if (bookingFor === 'photoshoots')
      return this.bookingService.gCancelledBookingsPhotoshoot(page, limit);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Get('get/bookings/cancellation-requests')
  async getCancellationRequests(
    @Query('bookingsFor') bookingFor: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (bookingFor === 'rooms')
      return this.bookingService.gCancellationRequestsRoom(page, limit);
    if (bookingFor === 'halls')
      return this.bookingService.gCancellationRequestsHall(page, limit);
    if (bookingFor === 'lawns')
      return this.bookingService.gCancellationRequestsLawn(page, limit);
  }

  // @UseGuards(JwtAccGuard)
  @Post('cancelReqBooking')
  async cancelReqBooking(
    @Query('bookingFor') bookingFor: string,
    @Query('bookID') bookID: string,
    @Query('reason') reason: string,
    @Req() req: { user: { id: string, name: string } },
  ) {
    const requestedBy = req.user?.name || 'Admin';

    if (bookingFor === 'rooms')
      return this.bookingService.cCancellationRequestRoom(Number(bookID), reason, requestedBy);
    if (bookingFor === 'halls')
      return this.bookingService.cCancellationRequestHall(Number(bookID), reason, requestedBy);
    if (bookingFor === 'lawns')
      return this.bookingService.cCancellationRequestLawn(Number(bookID), reason, requestedBy);
    if (bookingFor === 'photoshoots')
      return this.bookingService.cCancellationRequestPhotoshoot(Number(bookID), reason, requestedBy);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @Patch('updateCancellationReq')
  async updateCancellationReq(
    @Query('bookingFor') bookingFor: string,
    @Query('bookID') bookID: string,
    @Query('status') status: 'APPROVED' | 'REJECTED',
    @Query('remarks') remarks?: string,
  ) {
    return this.bookingService.updateCancellationReq(
      bookingFor,
      Number(bookID),
      status,
      remarks,
    );
  }

  @Get('member/bookings')
  async getMemberBookings(@Query('membershipNo') membershipNo: string) {
    return await this.bookingService.getMemberBookings(membershipNo);
  }

  ////////////////////////////////////////////////////////////////////////////

  @UseGuards(JwtAccGuard)
  @Get('member/bookings/all')
  async memberBookings(
    @Req() req: { user: { id: string } },
    @Query('type') type: 'Room' | 'Hall' | 'Lawn' | 'Photoshoot',
    @Query('membership_no') membership_no?: string,
  ) {
    const memberId = membership_no ? membership_no : req.user?.id;
    return await this.bookingService.memberBookings(memberId, type);
  }

  // fetch unpaid online vouchers for timer
  @UseGuards(JwtAccGuard)
  @Get('vouchers/unpaid/countdown')
  async unpaidVouchersForTimer(@Req() req: { user: { id: string } }) {
    return await this.bookingService.unpaidTimerVouchers(req?.user?.id)
  }

  // rules
  @UseGuards(JwtAccGuard)
  @Get('hall/rule')
  async hallRule() {
    return await this.contentService.getClubRules('HALL');
  }
  @UseGuards(JwtAccGuard)
  @Get('room/rule')
  async RoomRule() {
    return await this.contentService.getClubRules('ROOM');
  }
  @UseGuards(JwtAccGuard)
  @Get('lawn/rule')
  async LawnRule() {
    return await this.contentService.getClubRules('LAWN');
  }
  @UseGuards(JwtAccGuard)
  @Get('photo/rule')
  async PhotoRule() {
    return await this.contentService.getClubRules('PHOTOSHOOT');
  }

  @UseGuards(JwtAccGuard)
  @Delete('cancel-unpaid')
  async cancelUnpaidBooking(
    @Query('consumer_number') consumer_number: string,
  ) {
    return await this.bookingService.cancelUnpaidBooking(consumer_number);
  }
}

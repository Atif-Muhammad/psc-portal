import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
  constructor(private readonly bookingService: BookingService, private readonly contentService: ContentService) { }

  @Get('lock')
  async lockBookings() {
    return await this.bookingService.lock();
  }

  @Get('voucher')
  async getVouchers(
    @Query('bookingType') bookingType: string,
    @Query('bookingId') bookingId: string,
  ) {
    return await this.bookingService.getVouchersByBooking(
      bookingType,
      Number(bookingId),
    );
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Patch('voucher/update-status')
  async updateVoucherStatus(
    @Body() payload: { voucherId: number; status: string },
    @Req() req: any,
  ) {
    const adminName = req.user?.name || "system";
    return await this.bookingService.updateVoucherStatus(
      payload.voucherId,
      payload.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED',
      adminName,
    );
  }

  // booking //

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Post('create/booking')
  async createBooking(@Body() payload: BookingDto, @Req() req: any) {
    const adminName = req.user?.name || "system";
    // console.log(payload)
    if (payload.category === 'Room')
      return await this.bookingService.cBookingRoom({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Hall')
      return await this.bookingService.cBookingHall({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Lawn')
      return await this.bookingService.cBookingLawn({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Photoshoot')
      return await this.bookingService.cBookingPhotoshoot({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Patch('update/booking')
  async updateBooking(@Body() payload: Partial<BookingDto>, @Req() req: any) {
    const adminName = req.user?.name || "system";
    if (payload.category === 'Room')
      return await this.bookingService.uBookingRoom({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Hall')
      return await this.bookingService.uBookingHall({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Lawn')
      return await this.bookingService.uBookingLawn({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
    else if (payload.category === 'Photoshoot')
      return await this.bookingService.uBookingPhotoshoot({
        ...payload,
        paymentMode: PaymentMode.CASH,
      }, adminName);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Get('get/bookings/all')
  async getBookings(
    @Query('bookingsFor') bookingFor: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (bookingFor === 'rooms') return this.bookingService.gBookingsRoom(page, limit);
    if (bookingFor === 'halls') return this.bookingService.gBookingsHall(page, limit);
    if (bookingFor === 'lawns') return this.bookingService.gBookingsLawn(page, limit);
    if (bookingFor === 'photoshoots')
      return this.bookingService.gBookingPhotoshoot(page, limit);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @Delete('delete/booking')
  async deleteBooking(
    @Query('bookingFor') bookingFor: string,
    @Query() bookID: { bookID: string },
  ) {
    if (bookingFor === 'rooms')
      return this.bookingService.dBookingRoom(Number(bookID.bookID));
    if (bookingFor === 'halls')
      return this.bookingService.dBookingHall(Number(bookID.bookID));
    if (bookingFor === 'lawns')
      return this.bookingService.dBookingLawn(Number(bookID.bookID));
    if (bookingFor === 'photoshoots')
      return this.bookingService.dBookingPhotoshoot(Number(bookID.bookID));
  }

  @Get('member/bookings')
  async getMemberBookings(@Query('membershipNo') membershipNo: string) {
    return await this.bookingService.getMemberBookings(membershipNo);
  }

  ////////////////////////////////////////////////////////////////////////////
  // member bookings
  @Post('member/booking/room')
  async memberBookingRoom(@Body() payload: any) {
    const {
      membership_no,
      checkIn,
      checkOut,
      numberOfRooms,
      numberOfAdults,
      numberOfChildren,
      pricingType,
      specialRequest,
      totalPrice,
      selectedRoomIds,
      roomTypeId,
      paidBy = 'MEMBER',
      guestName,
      guestContact,
    } = payload;
    console.log(payload);

    if (!membership_no) {
      throw new NotFoundException('Membership number must be provided');
    }

    // Validate required fields
    if (!roomTypeId || !selectedRoomIds || !selectedRoomIds.length) {
      throw new BadRequestException(
        'Room type and selected rooms are required',
      );
    }

    const data = {
      membershipNo: membership_no,
      entityId: roomTypeId, // This should be roomTypeId for member booking
      category: 'Room',
      checkIn: checkIn,
      checkOut: checkOut,
      numberOfRooms: numberOfRooms,
      numberOfAdults: numberOfAdults,
      numberOfChildren: numberOfChildren,
      pricingType: pricingType,
      specialRequests: specialRequest || '',
      totalPrice: totalPrice,
      selectedRoomIds: selectedRoomIds,
      paymentStatus: 'PAID',
      paidAmount: totalPrice,
      pendingAmount: 0,
      paymentMode: 'ONLINE',
      paidBy,
      guestName,
      guestContact,
    };

    return await this.bookingService.cBookingRoomMember(data, 'member');
  }

  @Post('member/booking/hall')
  async memberBookingHall(@Body() payload: any) {
    const {
      membership_no,
      hallId,
      bookingDate,
      eventTime,
      eventType,
      pricingType,
      specialRequest,
      totalPrice,
      paidBy = 'MEMBER',
      guestName,
      guestContact,
    } = payload;

    if (!membership_no) {
      throw new NotFoundException('Membership number must be provided');
    }

    // Validate required fields
    if (!hallId) {
      throw new BadRequestException('Hall ID is required');
    }
    if (!bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!eventTime) {
      throw new BadRequestException('Event time slot is required');
    }
    if (!eventType) {
      throw new BadRequestException('Event type is required');
    }

    const data = {
      membershipNo: membership_no,
      entityId: hallId,
      bookingDate: bookingDate,
      eventTime: eventTime, // MORNING, EVENING, or NIGHT
      eventType: eventType,
      pricingType: pricingType,
      specialRequests: specialRequest || '',
      totalPrice: totalPrice,
      paymentStatus: 'PAID',
      paidAmount: totalPrice,
      pendingAmount: 0,
      paymentMode: 'ONLINE',

      paidBy,
      guestName,
      guestContact,
    };
    console.log('data:', data);

    return await this.bookingService.cBookingHallMember(data, 'member');
  }

  @Post('member/booking/lawn')
  async memberBookingLawn(@Body() payload: any) {
    console.log("test:", payload)
    const { membership_no } = payload.consumerInfo;
    const {
      lawnId,
      bookingDate,
      eventTime,
      eventType,
      pricingType,
      numberOfGuests,
      specialRequest,
      totalPrice,

      paidBy = 'MEMBER',
      guestName,
      guestContact,
    } = payload.bookingData;

    if (!membership_no) {
      throw new NotFoundException('Membership number must be provided');
    }

    // Validate required fields
    if (!lawnId) {
      throw new BadRequestException('Lawn ID is required');
    }
    if (!bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!eventTime) {
      throw new BadRequestException('Event time slot is required');
    }
    if (!eventType) {
      throw new BadRequestException('Event type is required');
    }

    const data = {
      membershipNo: membership_no,
      entityId: lawnId,
      bookingDate: bookingDate,
      eventTime: eventTime, // MORNING, EVENING, or NIGHT
      eventType: eventType,
      pricingType: pricingType,
      specialRequests: specialRequest || '',
      totalPrice: totalPrice,
      paymentStatus: 'PAID',
      paidAmount: totalPrice,
      pendingAmount: 0,
      paymentMode: 'ONLINE',
      numberOfGuests,
      paidBy,
      guestName,
      guestContact,
    };

    return await this.bookingService.cBookingLawnMember(data, 'member');
  }

  @Post('member/booking/photoshoot')
  async memberBookingPhotoshoot(@Body() payload: any) {
    const { membership_no } = payload.consumerInfo;
    const {
      photoshootId,
      bookingDate,
      startTime,
      pricingType,
      specialRequest,
      totalPrice,

      paidBy = 'MEMBER',
      guestName,
      guestContact,
    } = payload.bookingData;
    // console.log(payload)

    if (!membership_no) {
      throw new NotFoundException('Membership number must be provided');
    }

    // Validate required fields
    if (!photoshootId) {
      throw new BadRequestException('Photoshoot ID is required');
    }
    if (!bookingDate) {
      throw new BadRequestException('Booking date is required');
    }
    if (!startTime) {
      throw new BadRequestException('Event start time slot is required');
    }

    const data = {
      membershipNo: membership_no,
      entityId: photoshootId,
      bookingDate: bookingDate,
      timeSlot: startTime,
      pricingType: pricingType,
      specialRequests: specialRequest || '',
      totalPrice: totalPrice,
      paymentStatus: 'PAID',
      paidAmount: totalPrice,
      pendingAmount: 0,
      paymentMode: 'ONLINE',

      paidBy,
      guestName,
      guestContact,
    };
    console.log('data:', data);

    const done = await this.bookingService.cBookingPhotoshootMember(data, 'member');
    // console.log(done)
    return done;
  }

  @UseGuards(JwtAccGuard)
  @Get('member/bookings/all')
  async memberBookings(
    @Req() req: { user: { id: string } },
    @Query('type') type: 'Room' | 'Hall' | 'Lawn' | 'Photoshoot',
    @Query('membership_no') membership_no?: string
  ) {

    const memberId = membership_no ? membership_no : req.user?.id;
    return await this.bookingService.memberBookings(memberId, type)

  }



  // rules
  @UseGuards(JwtAccGuard)
  @Get('hall/rule')
  async hallRule(){
    return await this.contentService.getClubRules("HALL")
  }
  @UseGuards(JwtAccGuard)
  @Get('room/rule')
  async RoomRule(){
    return await this.contentService.getClubRules("ROOM")
  }
  @UseGuards(JwtAccGuard)
  @Get('lawn/rule')
  async LawnRule(){
    return await this.contentService.getClubRules("LAWN")
  }
  @UseGuards(JwtAccGuard)
  @Get('photo/rule')
  async PhotoRule(){
    return await this.contentService.getClubRules("PHOTOSHOOT")
  }
}

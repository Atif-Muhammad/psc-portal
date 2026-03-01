import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AffiliationService } from './affiliation.service';
import { BookingService } from 'src/booking/booking.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CreateAffiliatedClubDto,
  UpdateAffiliatedClubDto,
  CreateAffiliatedClubRequestDto,
  UpdateRequestStatusDto,
  AffiliatedRoomBookingDto,
  UpdateAffiliatedRoomBookingDto,
} from './dtos/affiliation.dto';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { PermissionsGuard } from 'src/common/guards/permission.guard';

@Controller('affiliation')
export class AffiliationController {
  constructor(
    private affiliationService: AffiliationService,
    private bookingService: BookingService,
  ) { }

  // -------------------- AFFILIATED CLUBS --------------------

  @UseGuards(JwtAccGuard)
  @Get('clubs')
  async getAffiliatedClubs() {
    return await this.affiliationService.getAffiliatedClubs();
  }

  @UseGuards(JwtAccGuard)
  @Get('clubs/active')
  async getAffiliatedClubsActive() {
    return await this.affiliationService.getAffiliatedClubsActive();
  }

  @UseGuards(JwtAccGuard)
  @Get('clubs/:id')
  async getAffiliatedClubById(@Param('id') id: string) {
    return await this.affiliationService.getAffiliatedClubById(Number(id));
  }

  @UseGuards(JwtAccGuard)
  @Post('clubs')
  @UseInterceptors(FileInterceptor('image'))
  async createAffiliatedClub(
    @Body() body: CreateAffiliatedClubDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return await this.affiliationService.createAffiliatedClub(
      { ...body, order: body.order ? Number(body.order) : 0 },
      adminName,
      file,
    );
  }

  @UseGuards(JwtAccGuard)
  @Put('clubs')
  @UseInterceptors(FileInterceptor('image'))
  async updateAffiliatedClub(
    @Body() body: UpdateAffiliatedClubDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return await this.affiliationService.updateAffiliatedClub(
      { ...body, order: body.order ? Number(body.order) : undefined },
      adminName,
      file,
    );
  }

  @UseGuards(JwtAccGuard)
  @Delete('clubs/:id')
  async deleteAffiliatedClub(@Param('id') id: string) {
    return await this.affiliationService.deleteAffiliatedClub(Number(id));
  }

  // -------------------- AFFILIATED CLUB REQUESTS --------------------

  @Get('requests')
  async getAffiliatedClubRequests(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clubId') clubId?: string,
  ) {
    return await this.affiliationService.getAffiliatedClubRequests(
      from,
      to,
      clubId ? Number(clubId) : undefined,
    );
  }

  @Get('requests/:id')
  async getRequestById(@Param('id') id: string) {
    return await this.affiliationService.getRequestById(Number(id));
  }

  @UseGuards(JwtAccGuard)
  @Post('requests')
  async createRequest(@Body() body: any, @Req() req: any) {
    console.log(req.body)
    const sender = req.body?.membershipNo;
    return await this.affiliationService.createRequest(
      { ...body, membershipNo: sender },
      sender,
    );
  }

  @UseGuards(JwtAccGuard)
  @Get('booking-stats')
  async getAffiliatedBookingStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return await this.affiliationService.getAffiliatedBookingStats(from, to);
  }

  @UseGuards(JwtAccGuard)
  @Get('bookings')
  async getRoomBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clubId') clubId?: string,
    @Query('status') status?: 'ACTIVE' | 'CANCELLED' | 'REQUESTS',
  ) {
    return await this.affiliationService.getAffiliatedRoomBookings(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      clubId ? Number(clubId) : undefined,
      status,
    );
  }

  @UseGuards(JwtAccGuard)
  @Post('booking')
  async createRoomBooking(@Body() body: AffiliatedRoomBookingDto, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    return await this.bookingService.cBookingRoomAff(body, adminName);
  }

  @UseGuards(JwtAccGuard)
  @Patch('booking/:id')
  async updateRoomBooking(
    @Param('id') id: string,
    @Body() body: UpdateAffiliatedRoomBookingDto,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return await this.bookingService.uBookingRoomAff({ ...body, id: Number(id) }, adminName);
  }
}

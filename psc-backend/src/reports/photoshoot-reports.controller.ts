import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PhotoshootReportsService } from './photoshoot-reports.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('reports/photoshoot')
@UseGuards(JwtAccGuard, RolesGuard)
export class PhotoshootReportsController {
  constructor(
    private readonly photoshootReportsService: PhotoshootReportsService,
  ) {}

  @Get('bookings')
  async getPhotoshootBookings(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('bookedBy') bookedBy?: string,
    @Query('memberNumber') memberNumber?: string,
    @Query('canceledBy') canceledBy?: string,
    @Query('bookedFor') bookedFor?: string,
  ) {
    return this.photoshootReportsService.getPhotoshootBookings({
      fromDate,
      toDate,
      bookedBy,
      memberNumber,
      canceledBy,
      bookedFor,
    });
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HallReportsService } from './hall-reports.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('reports/halls')
@UseGuards(JwtAccGuard, RolesGuard)
export class HallReportsController {
  constructor(private readonly hallReportsService: HallReportsService) {}

  @Get('monthly')
  async getMonthlyGrid(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.hallReportsService.getMonthlyGrid(fromDate, toDate);
  }

  @Get('daily-checkout')
  async getDailyCheckout(@Query('date') date: string) {
    return this.hallReportsService.getDailyCheckout(date);
  }

  @Get('bookings')
  async getHallBookings(
    @Query('venueType') venueType?: string,
    @Query('venueId') venueId?: string,
    @Query('eventType') eventType?: string,
    @Query('timeSlot') timeSlot?: string,
    @Query('bookingStatus') bookingStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('bookedBy') bookedBy?: string,
    @Query('memberNumber') memberNumber?: string,
    @Query('canceledBy') canceledBy?: string,
    @Query('bookedFor') bookedFor?: string,
  ) {
    return this.hallReportsService.getHallBookings({
      venueType,
      venueId,
      eventType,
      timeSlot,
      bookingStatus,
      paymentStatus,
      fromDate,
      toDate,
      bookedBy,
      memberNumber,
      canceledBy,
      bookedFor,
    });
  }
}

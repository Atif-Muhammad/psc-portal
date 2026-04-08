import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoomReportsService } from './room-reports.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('reports/rooms')
@UseGuards(JwtAccGuard, RolesGuard)
export class RoomReportsController {
  constructor(private readonly roomReportsService: RoomReportsService) {}

  @Get('daily-checkout')
  async getDailyCheckout(@Query('date') date?: string) {
    return this.roomReportsService.getDailyCheckout({ date });
  }

  @Get('monthly-checkout')
  async getMonthlyCheckout(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.roomReportsService.getMonthlyCheckout({ fromDate, toDate });
  }

  @Get('sales')
  async getSalesReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.roomReportsService.getSalesReport({ fromDate, toDate });
  }

  @Get('cancellations')
  async getCancellationReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.roomReportsService.getCancellationReport({ fromDate, toDate });
  }

  @Get('monthly-bills')
  async getMonthlyBills(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.roomReportsService.getMonthlyBills({ fromDate, toDate });
  }

  @Get('bookings')
  async getRoomBookings(
    @Query('bookingStatus') bookingStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('roomType') roomType?: string,
    @Query('roomId') roomId?: string,
    @Query('bookedBy') bookedBy?: string,
    @Query('memberNumber') memberNumber?: string,
    @Query('canceledBy') canceledBy?: string,
    @Query('bookedFor') bookedFor?: string,
  ) {
    return this.roomReportsService.getRoomBookings({
      bookingStatus,
      paymentStatus,
      fromDate,
      toDate,
      roomType,
      roomId,
      bookedBy,
      memberNumber,
      canceledBy,
      bookedFor,
    });
  }
}

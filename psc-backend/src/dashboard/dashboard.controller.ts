import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesEnum } from 'src/common/constants/roles.enum';

@Controller('dashboard')
@UseGuards(JwtAccGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  async getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.getStats(from, to);
  }
}

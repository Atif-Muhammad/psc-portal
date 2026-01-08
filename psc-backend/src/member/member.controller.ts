import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Res,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { RolesEnum } from 'src/common/constants/roles.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateMemberDto } from './dtos/create-member.dto';
import { MemberService } from './member.service';
import { NotificationService } from 'src/notification/notification.service';

@Controller('member')
export class MemberController {
  constructor(private member: MemberService, private notifications: NotificationService) { }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Post('create/member')
  async createMember(@Body() payload: CreateMemberDto, @Req() req: any) {
    const adminName = req.user?.name || "system";
    return this.member.createMember(payload, adminName);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Post('create/bulk/members')
  async createBulkMembers(@Body() payload: CreateMemberDto[], @Req() req: any) {
    const adminName = req.user?.name || "system";
    return this.member.createBulk(payload, adminName);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Patch('update/member')
  async updateMember(
    @Query('memberID') memberID: string,
    @Body() payload: Partial<CreateMemberDto>,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || "system";
    return this.member.updateMember(memberID, payload, adminName);
  }

  @Patch('/fcm-token')
  async updateFCMToken(@Query('memberID') memberID: string, @Body() payload: { fcmToken: string }) {
    return this.member.updateFCMToken(memberID, payload.fcmToken);
  }

  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
  @Delete('remove/member')
  async removeMember(@Query('memberID') memberID: string) {
    return this.member.removeMember(memberID);
  }

  @Get('search/members')
  async searchMembers(@Query('searchFor') searchFor: string) {
    return await this.member.searchMembers(searchFor);
  }

  @Get('get/members')
  async getMembers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return await this.member.getMembers({
      page,
      limit,
      search,
      status,
    });
  }


  @UseGuards(JwtAccGuard)
  @Get('notifications')
  async getNotifications(@Req() req: {user: {id: string}}) {
    return await this.notifications.getMemberNotifications(req.user?.id);
  }

}

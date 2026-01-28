import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RolesEnum } from 'src/common/constants/roles.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PhotoShootDto } from './dtos/photoshoot.dto';
import { PhotoshootService } from './photoshoot.service';

@Controller('photoshoot')
export class PhotoshootController {
  constructor(private photo: PhotoshootService) {}

  // photoshoot
  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 5))
  @Post('create/photoShoot')
  async createPhotoShoot(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() payload: PhotoShootDto,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.photo.createPhotoShoot(payload, files, adminName);
  }
  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 5))
  @Patch('update/photoShoot')
  async updatePhotoShoot(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() payload: Partial<PhotoShootDto>,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.photo.updatePhotoshoot(payload, adminName, files);
  }
  // @UseGuards(JwtAccGuard, RolesGuard)
  // @Roles(RolesEnum.SUPER_ADMIN)
  @UseGuards(JwtAccGuard)
  @Get('get/photoShoots')
  async getPhotoShoots() {
    return this.photo.getPhotoshoots();
  }
  // @UseGuards(JwtAccGuard, RolesGuard)
  // @Roles(RolesEnum.SUPER_ADMIN)
  @UseGuards(JwtAccGuard)
  @Get('get/photoShoots/available')
  async getAvailPhotoShoots() {
    return this.photo.getPhotoshoots();
  }
  @UseGuards(JwtAccGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @Delete('delete/photoShoot')
  async deletePhotoShoot(@Query('id') id: string) {
    return this.photo.deletePhotoshoot(Number(id));
  }

  @UseGuards(JwtAccGuard)
  async reservePhotoShoots(@Req() req: any, @Body() payload: any) {
    const admin = req.user;
    const adminName = admin?.name || 'system';
    return this.photo.reservePhotoshoot(
      payload.photoshootIds,
      payload.reserve,
      Number(admin?.id),
      payload.timeSlot,
      payload.reserveFrom,
      payload.reserveTo,
      payload.remarks,
      adminName,
    );
  }

  @UseGuards(JwtAccGuard)
  @Get('logs')
  async getPhotoshootLogs(
    @Query('photoshootId') photoshootId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.photo.getPhotoshootLogs(Number(photoshootId), from, to);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Patch,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { ContentService } from './content.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // --- Events ---
  @UseGuards(JwtAccGuard)
  @Post('events')
  @UseInterceptors(FilesInterceptor('images', 5)) // Max 5 images
  createEvent(
    @Body() data: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.createEvent(data, adminName, files);
  }

  @Get('events')
  getEvents() {
    return this.contentService.getAllEvents();
  }

  @UseGuards(JwtAccGuard)
  @Put('events/:id')
  @UseInterceptors(FilesInterceptor('images', 5))
  updateEvent(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.updateEvent(+id, data, adminName, files);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.contentService.deleteEvent(+id);
  }

  // --- Club Rules ---
  @UseGuards(JwtAccGuard)
  @Post('rules')
  createRule(@Body() data: any, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    return this.contentService.createClubRule(data, adminName);
  }

  @Get('rules')
  getRules(@Query('type') type?: string) {
    return this.contentService.getClubRules(type);
  }

  @UseGuards(JwtAccGuard)
  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    return this.contentService.updateClubRule(+id, data, adminName);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.contentService.deleteClubRule(+id);
  }

  // --- Announcements ---
  @UseGuards(JwtAccGuard)
  @Post('announcements')
  createAnnouncement(@Body() data: any, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    return this.contentService.createAnnouncement(data, adminName);
  }

  @Get('announcements')
  getAnnouncements() {
    return this.contentService.getAnnouncements();
  }

  @UseGuards(JwtAccGuard)
  @Put('announcements/:id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.updateAnnouncement(+id, data, adminName);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.contentService.deleteAnnouncement(+id);
  }

  // --- About Us ---
  @UseGuards(JwtAccGuard)
  @Post('about-us')
  upsertAboutUs(@Body() data: any, @Req() req: any) {
    const adminName = req.user?.name || 'system';
    return this.contentService.upsertAboutUs(data, adminName);
  }

  @Get('about-us')
  getAboutUs() {
    return this.contentService.getAboutUs();
  }

  // --- Club History ---
  @UseGuards(JwtAccGuard)
  @Post('history')
  @UseInterceptors(FileInterceptor('image'))
  createHistory(
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.createClubHistory(data, adminName, file);
  }

  @Get('history')
  getHistory() {
    return this.contentService.getClubHistory();
  }

  @UseGuards(JwtAccGuard)
  @Put('history/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateHistory(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.updateClubHistory(+id, data, adminName, file);
  }

  @Delete('history/:id')
  deleteHistory(@Param('id') id: string) {
    return this.contentService.deleteClubHistory(+id);
  }

  // --- Promotional Ads ---
  @UseGuards(JwtAccGuard)
  @Post('ads')
  @UseInterceptors(FileInterceptor('image'))
  createAd(
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.createAd(data, adminName, file);
  }

  @Get('ads')
  getAds() {
    return this.contentService.getAds();
  }

  @UseGuards(JwtAccGuard)
  @Put('ads/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateAd(
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const adminName = req.user?.name || 'system';
    return this.contentService.updateAd(+id, data, adminName, file);
  }

  @Delete('ads/:id')
  deleteAd(@Param('id') id: string) {
    return this.contentService.deleteAd(+id);
  }
}

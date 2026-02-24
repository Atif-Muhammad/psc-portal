import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { MessingService } from './messing.service';
import { JwtAccGuard } from '../common/guards/jwt-access.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('messing')
export class MessingController {
  constructor(private readonly messingService: MessingService) { }

  // --- Categories ---

  @Post('category')
  @UseGuards(JwtAccGuard)
  @UseInterceptors(FilesInterceptor('files', 5)) // Max 5 files
  createCategory(
    @Body() body: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    const createdBy = req.user.username || '';
    return this.messingService.createCategory(body, files, createdBy);
  }
  @UseGuards(JwtAccGuard)
  @Get('category')
  getCategories() {
    return this.messingService.getCategories();
  }

  @Get('category/:id')
  getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.getCategoryById(id);
  }

  @Patch('category/:id')
  @UseGuards(JwtAccGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    const updatedBy = req.user.username || '';
    // body may contain 'imagesToDelete'
    return this.messingService.updateCategory(id, body, files, updatedBy);
  }

  @Delete('category/:id')
  @UseGuards(JwtAccGuard)
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.deleteCategory(id);
  }

  // --- Sub-Categories ---

  @Post('subcategory')
  @UseGuards(JwtAccGuard)
  createSubCategory(@Body() body: any, @Request() req) {
    const createdBy = req.user.username || '';
    return this.messingService.createSubCategory(body, createdBy);
  }

  @Get('subcategory/category/:categoryId')
  @UseGuards(JwtAccGuard)
  getSubCategoriesByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.messingService.getSubCategoriesByCategory(categoryId);
  }

  @Get('subcategory/:id')
  @UseGuards(JwtAccGuard)
  getSubCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.getSubCategoryById(id);
  }

  @Patch('subcategory/:id')
  @UseGuards(JwtAccGuard)
  updateSubCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req,
  ) {
    const updatedBy = req.user.username || '';
    return this.messingService.updateSubCategory(id, body, updatedBy);
  }

  @Delete('subcategory/:id')
  @UseGuards(JwtAccGuard)
  deleteSubCategory(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.deleteSubCategory(id);
  }

  // --- Items ---

  @Post('item')
  @UseGuards(JwtAccGuard)
  createItem(@Body() body: any, @Request() req) {
    const createdBy = req.user.username || '';
    if (body.messingSubCategoryId)
      body.messingSubCategoryId = Number(body.messingSubCategoryId);
    if (body.price) body.price = Number(body.price);
    if (body.order) body.order = Number(body.order);

    return this.messingService.createItem(body, createdBy);
  }

  @Get('item/subcategory/:subCategoryId')
  @UseGuards(JwtAccGuard)
  getItemsBySubCategory(
    @Param('subCategoryId', ParseIntPipe) subCategoryId: number,
  ) {
    return this.messingService.getItemsBySubCategory(subCategoryId);
  }

  @Get('item/:id')
  @UseGuards(JwtAccGuard)
  getItem(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.getItemById(id);
  }

  @Patch('item/:id')
  @UseGuards(JwtAccGuard)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req,
  ) {
    const updatedBy = req.user.username || '';
    if (body.price) body.price = Number(body.price);
    if (body.order) body.order = Number(body.order);
    return this.messingService.updateItem(id, body, updatedBy);
  }

  @Delete('item/:id')
  @UseGuards(JwtAccGuard)
  deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.messingService.deleteItem(id);
  }
}

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { AddFeedbackRemarkDto, UpdateFeedbackStatusDto, CreateFeedbackCategoryDto, CreateFeedbackSubCategoryDto, CreateFeedbackDto } from './dtos/feedback.dto';

@Controller('feedback')
export class FeedbackController {
    constructor(private feedbackService: FeedbackService) { }

    @UseGuards(JwtAccGuard)
    @Post('create')
    async createFeedback(@Body() dto: CreateFeedbackDto, @Req() req: {user: {id: string}}) {
        return this.feedbackService.createFeedback(dto, req.user.id);
    }

    @UseGuards(JwtAccGuard)
    @Get()
    async findAll() {
        return this.feedbackService.findAll();
    }

    @UseGuards(JwtAccGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateFeedbackStatusDto,
    ) {
        return this.feedbackService.updateStatus(id, dto.status);
    }

    @UseGuards(JwtAccGuard)
    @Post(':id/remark')
    async addRemark(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AddFeedbackRemarkDto,
    ) {
        return this.feedbackService.addRemark(id, dto);
    }

    // Categories
    @UseGuards(JwtAccGuard)
    @Get('categories')
    async findAllCategories() {
        return this.feedbackService.findAllCategories();
    }

    @UseGuards(JwtAccGuard)
    @Post('categories')
    async createCategory(@Body() dto: CreateFeedbackCategoryDto) {
        return this.feedbackService.createCategory(dto);
    }

    @UseGuards(JwtAccGuard)
    @Delete('categories/:id')
    async deleteCategory(@Param('id', ParseIntPipe) id: number) {
        return this.feedbackService.deleteCategory(id);
    }

    // SubCategories
    @UseGuards(JwtAccGuard)
    @Get('subcategories')
    async findAllSubCategories() {
        return this.feedbackService.findAllSubCategories();
    }

    @UseGuards(JwtAccGuard)
    @Post('subcategories')
    async createSubCategory(@Body() dto: CreateFeedbackSubCategoryDto) {
        return this.feedbackService.createSubCategory(dto);
    }

    @UseGuards(JwtAccGuard)
    @Delete('subcategories/:id')
    async deleteSubCategory(@Param('id', ParseIntPipe) id: number) {
        return this.feedbackService.deleteSubCategory(id);
    }

    @UseGuards(JwtAccGuard)
    @Patch(':id/category')
    async assignCategory(
        @Param('id', ParseIntPipe) id: number,
        @Body('categoryId') categoryId: number | null,
    ) {
        return this.feedbackService.assignCategory(id, categoryId);
    }

    @UseGuards(JwtAccGuard)
    @Patch(':id/subcategory')
    async assignSubCategory(
        @Param('id', ParseIntPipe) id: number,
        @Body('subCategoryId') subCategoryId: number | null,
        @Body('otherSubCategory') otherSubCategory?: string,
    ) {
        return this.feedbackService.assignSubCategory(id, subCategoryId, otherSubCategory);
    }

    @UseGuards(JwtAccGuard)
    @Get('categories-subcategories')
    async getCategory() {
        const cats = await this.feedbackService.findAllCategories() || {}
        const subCats = await this.feedbackService.findAllSubCategories() || {}
        return { categories: cats, subCategories: subCats }

    }
}

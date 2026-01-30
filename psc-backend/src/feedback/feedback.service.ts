import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FeedbackStatus } from '@prisma/client';
import { AddFeedbackRemarkDto, CreateFeedbackCategoryDto, CreateFeedbackSubCategoryDto } from './dtos/feedback.dto';

@Injectable()
export class FeedbackService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.feedback.findMany({
            include: {
                member: {
                    select: {
                        Name: true,
                        Membership_No: true,
                        Contact_No: true,
                        Email: true,
                    },
                },
                category: true,
                subCategory: true,
                remarks: {
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateStatus(id: number, status: FeedbackStatus) {
        const feedback = await this.prisma.feedback.findUnique({ where: { id } });
        if (!feedback) throw new NotFoundException('Feedback not found');

        return this.prisma.feedback.update({
            where: { id },
            data: { status },
        });
    }

    async addRemark(id: number, dto: AddFeedbackRemarkDto) {
        const feedback = await this.prisma.feedback.findUnique({ where: { id } });
        if (!feedback) throw new NotFoundException('Feedback not found');

        return this.prisma.feedbackRemark.create({
            data: {
                feedbackId: id,
                adminName: dto.adminName,
                remark: dto.remark,
            },
        });
    }

    // Categories
    async findAllCategories() {
        return this.prisma.feedbackCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async createCategory(dto: CreateFeedbackCategoryDto) {
        return this.prisma.feedbackCategory.create({
            data: { name: dto.name },
        });
    }

    async deleteCategory(id: number) {
        return this.prisma.feedbackCategory.delete({
            where: { id },
        });
    }

    // SubCategories
    async findAllSubCategories() {
        return this.prisma.feedbackSubCategory.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async createSubCategory(dto: CreateFeedbackSubCategoryDto) {
        return this.prisma.feedbackSubCategory.create({
            data: { name: dto.name },
        });
    }

    async deleteSubCategory(id: number) {
        return this.prisma.feedbackSubCategory.delete({
            where: { id },
        });
    }

    async assignCategory(feedbackId: number, categoryId: number | null) {
        return this.prisma.feedback.update({
            where: { id: feedbackId },
            data: { categoryId },
        });
    }

    async assignSubCategory(feedbackId: number, subCategoryId: number | null, otherSubCategory?: string) {
        return this.prisma.feedback.update({
            where: { id: feedbackId },
            data: {
                subCategoryId,
                otherSubCategory: subCategoryId === null ? otherSubCategory || null : null
            },
        });
    }
}

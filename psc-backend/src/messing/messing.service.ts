import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class MessingService {
    constructor(
        private prisma: PrismaService,
        private cloudinaryService: CloudinaryService
    ) { }

    // --- Category CRUD ---

    async createCategory(data: any, files: Array<Express.Multer.File>, createdBy: string) {
        let uploadedImages:any[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await this.cloudinaryService.uploadFile(file);
                uploadedImages.push(result);
            }
        }

        // data.category should be string
        return this.prisma.messingCategory.create({
            data: {
                category: data.category,
                images: uploadedImages, // Store array of { url, public_id }
                createdBy,
                updatedBy: createdBy
            }
        });
    }

    async getCategories() {
        return this.prisma.messingCategory.findMany({
            include: {
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async getCategoryById(id: number) {
        const category = await this.prisma.messingCategory.findUnique({
            where: { id },
            include: {
                items: true
            }
        });
        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    async updateCategory(id: number, data: any, files: Array<Express.Multer.File>, updatedBy: string) {
        const category = await this.getCategoryById(id);

        let currentImages = category.images as any[];
        if (!Array.isArray(currentImages)) currentImages = [];

        // Handle deletions
        if (data.imagesToDelete) {
            const toDelete = Array.isArray(data.imagesToDelete) ? data.imagesToDelete : [data.imagesToDelete];

            for (const publicId of toDelete) {
                await this.cloudinaryService.removeFile(publicId);
                currentImages = currentImages.filter(img => img.public_id !== publicId);
            }
        }

        // Handle new uploads
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await this.cloudinaryService.uploadFile(file);
                currentImages.push(result);
            }
        }

        return this.prisma.messingCategory.update({
            where: { id },
            data: {
                category: data.category,
                images: currentImages,
                updatedBy
            }
        });
    }

    async deleteCategory(id: number) {
        const category = await this.getCategoryById(id);

        const images = category.images as any[];
        if (Array.isArray(images)) {
            for (const img of images) {
                if (img.public_id) {
                    await this.cloudinaryService.removeFile(img.public_id);
                }
            }
        }

        return this.prisma.messingCategory.delete({
            where: { id }
        });
    }

    // --- Menu Items CRUD ---

    async createItem(data: any, createdBy: string) {
        return this.prisma.messingItem.create({
            data: {
                ...data,
                createdBy,
                updatedBy: createdBy
            },
            include: {
                messingCategory: true
            }
        });
    }

    async getItemsByCategory(categoryId: number) {
        return this.prisma.messingItem.findMany({
            where: { messingCategoryId: categoryId },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async getItemById(id: number) {
        const item = await this.prisma.messingItem.findUnique({
            where: { id },
            include: { messingCategory: true }
        });
        if (!item) throw new NotFoundException('Item not found');
        return item;
    }

    async updateItem(id: number, data: any, updatedBy: string) {
        await this.getItemById(id);
        return this.prisma.messingItem.update({
            where: { id },
            data: {
                ...data,
                updatedBy
            }
        });
    }

    async deleteItem(id: number) {
        await this.getItemById(id);
        return this.prisma.messingItem.delete({
            where: { id }
        });
    }
}

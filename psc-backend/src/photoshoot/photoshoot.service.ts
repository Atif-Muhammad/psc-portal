import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PhotoShootDto } from './dtos/photoshoot.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class PhotoshootService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) { }

  // ─────────────────────────── PHOTOSHOOT ───────────────────────────
  async createPhotoShoot(
    payload: PhotoShootDto,
    files: Express.Multer.File[],
    createdBy: string,
  ) {
    const uploadedImages: { url: string; publicId: string }[] = [];

    // Validate max 5 images
    if (files && files.length > 5) {
      throw new HttpException(
        'Maximum 5 images allowed per photoshoot package',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const file of files ?? []) {
      const img = await this.cloudinaryService.uploadFile(file);
      uploadedImages.push({
        url: img.url,
        publicId: img.public_id,
      });
    }

    const photoshoot = await this.prismaService.photoshoot.create({
      data: {
        description: payload.description || "",
        memberCharges: Number(payload.memberCharges),
        guestCharges: Number(payload.guestCharges),
        images: uploadedImages,
        createdBy,
      },
    });

    if (payload.outOfOrders && payload.outOfOrders.length > 0) {
      const outOfOrderData = payload.outOfOrders.map((oo) => ({
        photoshootId: photoshoot.id,
        reason: oo.reason,
        startDate: new Date(oo.startDate),
        endDate: new Date(oo.endDate),
        createdBy,
      }));

      await this.prismaService.photoshootOutOfOrder.createMany({
        data: outOfOrderData,
      });
    }

    return photoshoot;
  }

  async getPhotoshoots() {
    return await this.prismaService.photoshoot.findMany({
      include: {
        bookings: {
          include: {
            member: {
              select: { Name: true },
            },
          },
        },
        reservations: {
          include: {
            admin: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        outOfOrders: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePhotoshoot(
    payload: Partial<PhotoShootDto>,
    updatedBy: string,
    files: Express.Multer.File[] = [],
  ) {
    if (!payload.id)
      throw new HttpException(
        'Photoshoot ID is required',
        HttpStatus.BAD_REQUEST,
      );

    const photoshoot = await this.prismaService.photoshoot.findUnique({
      where: { id: Number(payload.id) },
    });

    if (!photoshoot) {
      throw new HttpException('Photoshoot not found', HttpStatus.NOT_FOUND);
    }

    // Handle images
    const keepImagePublicIds = Array.isArray(payload.existingimgs)
      ? payload.existingimgs
      : payload.existingimgs
        ? [payload.existingimgs]
        : [];

    const filteredExistingImages = Array.isArray(photoshoot.images)
      ? (photoshoot.images as any[]).filter((img: any) =>
        keepImagePublicIds.includes(img.publicId),
      )
      : [];

    const newUploadedImages: any[] = [];
    for (const file of files) {
      const result: any = await this.cloudinaryService.uploadFile(file);
      newUploadedImages.push({
        url: result.secure_url || result.url,
        publicId: result.public_id,
      });
    }

    const finalImages = [...filteredExistingImages, ...newUploadedImages];

    // Validate max 5 images
    if (finalImages.length > 5) {
      throw new HttpException(
        'Maximum 5 images allowed per photoshoot package',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedPhotoshoot = await this.prismaService.photoshoot.update({
      where: { id: Number(payload.id) },
      data: {
        description: payload.description,
        memberCharges: payload.memberCharges
          ? Number(payload.memberCharges)
          : undefined,
        guestCharges: payload.guestCharges
          ? Number(payload.guestCharges)
          : undefined,
        images: finalImages,
        updatedBy,
      },
      include: {
        outOfOrders: true,
      },
    });

    if (payload.outOfOrders) {
      await this.prismaService.photoshootOutOfOrder.deleteMany({
        where: { photoshootId: Number(payload.id) },
      });

      if (payload.outOfOrders.length > 0) {
        const outOfOrderData = payload.outOfOrders.map((oo) => ({
          photoshootId: Number(payload.id),
          reason: oo.reason,
          startDate: new Date(oo.startDate),
          endDate: new Date(oo.endDate),
          updatedBy,
          createdBy: oo.id ? undefined : updatedBy,
        }));

        await this.prismaService.photoshootOutOfOrder.createMany({
          data: outOfOrderData,
        });
      }
    }

    return updatedPhotoshoot;
  }

  async deletePhotoshoot(id: number) {
    const photoshoot = await this.prismaService.photoshoot.findUnique({
      where: { id },
    });

    if (!photoshoot) {
      throw new HttpException('Photoshoot not found', HttpStatus.NOT_FOUND);
    }

    // Delete images from Cloudinary
    if (Array.isArray(photoshoot.images)) {
      const deletePromises = (photoshoot.images as any[])
        .filter((img: { publicId: string }) => img?.publicId)
        .map((img: { publicId: string }) =>
          this.cloudinaryService
            .removeFile(img.publicId)
            .catch((error) =>
              console.error(`Failed to delete image ${img.publicId}:`, error),
            ),
        );

      await Promise.all(deletePromises);
    }

    return await this.prismaService.photoshoot.delete({
      where: { id },
    });
  }

  // ─────────────────────────── PHOTOSHOOT RESERVATIONS ───────────────────────────
  async reservePhotoshoot(
    photoshootIds: number[],
    reserve: boolean,
    adminId: number,
    timeSlot: string,
    reserveFrom?: string,
    reserveTo?: string,
    remarks?: string,
    auditorName: string = 'system',
  ) {
    // Skip conflict checks as requested by USER

    if (reserve) {
      if (!reserveFrom || !reserveTo || !timeSlot) {
        throw new HttpException(
          'Reservation dates and time slot are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const reservedFrom = new Date(reserveFrom);
      const reservedTo = new Date(reserveTo);

      return await this.prismaService.$transaction(async (prisma) => {
        // Create reservations
        const reservations = photoshootIds.map((photoshootId) => ({
          photoshootId,
          reservedFrom,
          reservedTo,
          reservedBy: adminId,
          timeSlot,
          remarks: remarks || null,
          createdBy: auditorName,
          updatedBy: auditorName,
        }));

        await prisma.photoshootReservation.createMany({ data: reservations });

        await prisma.photoshoot.updateMany({
          where: { id: { in: photoshootIds } },
          data: { isReserved: true },
        });

        return {
          message: `${photoshootIds.length} photoshoot(s) reserved successfully for ${timeSlot.toLowerCase()} slot`,
          count: photoshootIds.length,
        };
      });
    } else {
      // UNRESERVE LOGIC
      if (reserveFrom && reserveTo && timeSlot) {
        const reservedFrom = new Date(reserveFrom);
        const reservedTo = new Date(reserveTo);

        const result =
          await this.prismaService.photoshootReservation.deleteMany({
            where: {
              photoshootId: { in: photoshootIds },
              reservedFrom: reservedFrom,
              reservedTo: reservedTo,
              timeSlot,
            },
          });

        // Update isReserved status
        for (const photoshootId of photoshootIds) {
          const hasUpcoming =
            await this.prismaService.photoshootReservation.findFirst({
              where: {
                photoshootId,
                reservedTo: { gte: new Date() },
              },
            });

          await this.prismaService.photoshoot.update({
            where: { id: photoshootId },
            data: { isReserved: !!hasUpcoming },
          });
        }

        return {
          message: `${result.count} reservation(s) removed`,
          count: result.count,
        };
      }
    }
  }

  async getPhotoshootLogs(photoshootId: number, from: string, to: string) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const [reservations, bookings, outOfOrders] = await Promise.all([
      this.prismaService.photoshootReservation.findMany({
        where: {
          photoshootId,
          OR: [
            { reservedFrom: { lte: toDate, gte: fromDate } },
            { reservedTo: { lte: toDate, gte: fromDate } },
          ],
        },
        include: {
          admin: {
            select: { id: true, name: true },
          },
        },
        orderBy: { reservedFrom: 'desc' },
      }),
      this.prismaService.photoshootBooking.findMany({
        where: {
          photoshootId,
          bookingDate: { lte: toDate, gte: fromDate },
        },
        include: {
          member: {
            select: { Name: true, Membership_No: true },
          },
        },
        orderBy: { bookingDate: 'desc' },
      }),
      this.prismaService.photoshootOutOfOrder.findMany({
        where: {
          photoshootId,
          OR: [
            { startDate: { lte: toDate, gte: fromDate } },
            { endDate: { lte: toDate, gte: fromDate } },
          ],
        },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    return { reservations, bookings, outOfOrders };
  }
}

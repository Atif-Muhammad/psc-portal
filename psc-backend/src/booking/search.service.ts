import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
    constructor(private prisma: PrismaService) { }

    async unifiedSearch(query: string) {
        if (!query || query.trim() === '') {
            return [];
        }

        const trimmedQuery = query.trim();
        const results: any[] = [];

        // 1. Search by Consumer Number or Voucher No in PaymentVoucher
        let voucher = await this.prisma.paymentVoucher.findUnique({
            where: { consumer_number: trimmedQuery },
        });

        if (!voucher) {
            voucher = await this.prisma.paymentVoucher.findUnique({
                where: { voucher_no: trimmedQuery },
            });
        }

        if (voucher && voucher.booking_id && voucher.booking_type) {
            const booking = await this.getBookingDetails(voucher.booking_type, voucher.booking_id);
            if (booking) {
                results.push({
                    type: 'Voucher',
                    category: voucher.booking_type,
                    bookingId: voucher.booking_id,
                    consumerNumber: voucher.consumer_number,
                    voucherNo: voucher.voucher_no,
                    amount: voucher.amount,
                    status: voucher.status,
                    booking: booking,
                });
            }
        }

        // 2. Search by Booking ID (if query is numeric)
        const bookingId = parseInt(trimmedQuery);
        if (!isNaN(bookingId)) {
            // Search in all booking tables
            const roomBooking = await this.getBookingDetails('ROOM', bookingId);
            if (roomBooking) results.push({ type: 'Booking', category: 'ROOM', bookingId, booking: roomBooking });

            const hallBooking = await this.getBookingDetails('HALL', bookingId);
            if (hallBooking) results.push({ type: 'Booking', category: 'HALL', bookingId, booking: hallBooking });

            const lawnBooking = await this.getBookingDetails('LAWN', bookingId);
            if (lawnBooking) results.push({ type: 'Booking', category: 'LAWN', bookingId, booking: lawnBooking });

            const photoshootBooking = await this.getBookingDetails('PHOTOSHOOT', bookingId);
            if (photoshootBooking) results.push({ type: 'Booking', category: 'PHOTOSHOOT', bookingId, booking: photoshootBooking });

            const affBooking = await this.getBookingDetails('AFF_ROOM', bookingId);
            if (affBooking) results.push({ type: 'Booking', category: 'AFF_ROOM', bookingId, booking: affBooking });
        }

        // De-duplicate results by category and bookingId
        const uniqueResults: any[] = [];
        const seen = new Set();
        for (const res of results) {
            const key = `${res.category}-${res.bookingId}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(res);
            }
        }

        return uniqueResults;
    }

    private async getBookingDetails(type: string, id: number) {
        const includeMember = {
            select: {
                Membership_No: true,
                Name: true,
                Email: true,
                Contact_No: true,
                Balance: true,
            },
        };

        switch (type) {
            case 'ROOM':
                return await this.prisma.roomBooking.findUnique({
                    where: { id },
                    include: { member: includeMember, rooms: { include: { room: { include: { roomType: true } } } } },
                });
            case 'HALL':
                return await this.prisma.hallBooking.findUnique({
                    where: { id },
                    include: { member: includeMember, hall: true },
                });
            case 'LAWN':
                return await this.prisma.lawnBooking.findUnique({
                    where: { id },
                    include: { member: includeMember, lawn: true },
                });
            case 'PHOTOSHOOT':
                return await this.prisma.photoshootBooking.findUnique({
                    where: { id },
                    include: { member: includeMember, photoshoot: true },
                });
            case 'AFF_ROOM':
                return await this.prisma.affClubBooking.findUnique({
                    where: { id },
                    include: { affiliatedClub: true, rooms: { include: { room: { include: { roomType: true } } } } },
                });
            default:
                return null;
        }
    }
}

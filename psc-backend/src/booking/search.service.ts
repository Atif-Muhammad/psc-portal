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
            // Fetch minimal member info for the search card
            const member = await this.prisma.member.findUnique({
                where: { Membership_No: voucher.membership_no },
                select: { Name: true, Membership_No: true },
            });

            results.push({
                type: 'Voucher',
                category: voucher.booking_type,
                bookingId: voucher.booking_id,
                consumerNumber: voucher.consumer_number,
                voucherNo: voucher.voucher_no,
                amount: voucher.amount,
                status: voucher.status,
                issuedAt: voucher.issued_at,
                paidAt: voucher.paid_at,
                issuedBy: voucher.issued_by,
                paymentMode: voucher.payment_mode,
                member: member,
            });
        }

        return results;
    }

    async getUnifiedBooking(type: string, id: number) {
        return await this.getBookingDetails(type, id);
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

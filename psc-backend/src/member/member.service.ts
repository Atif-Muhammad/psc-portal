import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMemberDto } from './dtos/create-member.dto';

import { Prisma, MemberStatus as prismaMemberStatus } from '@prisma/client';

@Injectable()
export class MemberService {
  constructor(private prismaService: PrismaService) { }

  private getDerivedStatus(actualStatus: string): string {
    const status = actualStatus?.toUpperCase();
    switch (status) {
      case 'REGULAR':
      case 'CLEAR':
      case 'HONORARY':
        return 'active';
      case 'ABSENT':
      case 'SUSPENDED':
      case 'DEFAULTER':
        return 'deactivated';
      case 'TERMINATED':
      case 'CANCELLED':
      case 'DIED':
        return 'blocked';
      default:
        return 'active';
    }
  }


  async createMember(payload: CreateMemberDto, createdBy: string) {
    const { Name, Email, Membership_No, Contact_No, Balance, Other_Details, Actual_Status } =
      payload;

    const existingMember = await this.prismaService.member.findFirst({
      where: { OR: [{ Email }, { Contact_No }] },
    });
    if (existingMember)
      throw new HttpException('Member already exists', HttpStatus.BAD_REQUEST);

    return this.prismaService.member.create({
      data: {
        Name,
        Email,
        Membership_No,
        Contact_No,
        Balance,
        Actual_Status: Actual_Status || 'CLEAR',
        Status: this.getDerivedStatus(Actual_Status || 'CLEAR'),
        Other_Details,
        createdBy,
      },
    });
  }

  async createBulk(payload: CreateMemberDto[], createdBy: string) {
    const operations = payload.map((row) => {
      const actualStatus = row.Actual_Status?.toString() || 'CLEAR';
      return this.prismaService.member.upsert({
        where: { Membership_No: row.Membership_No!.toString() },
        update: {
          Name: row.Name!,
          Email: row.Email!,
          Contact_No: row.Contact_No!.toString(),
          Actual_Status:
            prismaMemberStatus[actualStatus as keyof typeof prismaMemberStatus],
          Status: this.getDerivedStatus(actualStatus),
          Balance: Number(row.Balance!),
          Other_Details: row.Other_Details!,
        },
        create: {
          Membership_No: row.Membership_No!.toString(),
          Name: row.Name!,
          Email: row.Email!,
          Contact_No: row.Contact_No!.toString(),
          Actual_Status:
            prismaMemberStatus[actualStatus as keyof typeof prismaMemberStatus],
          Status: this.getDerivedStatus(actualStatus),
          Balance: Number(row.Balance!),
          Other_Details: row.Other_Details!,
          createdBy,
        },
      });
    });

    await this.prismaService.$transaction(operations);
  }

  async updateMember(
    memberID: string,
    payload: Partial<CreateMemberDto>,
    updatedBy: string,
  ) {
    const memberExists = await this.prismaService.member.findFirst({
      where: { Membership_No: memberID.toString() },
    });
    if (!memberExists)
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);

    const updateData: any = {
      Membership_No: payload.Membership_No,
      Name: payload.Name,
      Email: payload.Email,
      Contact_No: payload.Contact_No,
      Other_Details: payload.Other_Details,
      updatedBy,
    };

    if (payload.Actual_Status) {
      updateData.Actual_Status = payload.Actual_Status;
      updateData.Status = this.getDerivedStatus(payload.Actual_Status);
    }

    return this.prismaService.member.update({
      where: { Membership_No: memberID },
      data: updateData,
    });
  }

  async updateFCMToken(memberID: string, fcmToken: string) {
    return this.prismaService.member.update({
      where: { Membership_No: memberID },
      data: { FCMToken: fcmToken },
    });
  }

  async removeMember(memberID: string) {
    // Check if member exists
    const memberExists = await this.prismaService.member.findFirst({
      where: { Membership_No: memberID.toString() },
    });

    if (!memberExists) {
      throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
    }

    // Delete member (Prisma will handle cascading deletes based on schema)
    try {
      return await this.prismaService.member.delete({
        where: { Membership_No: memberID },
      });
    } catch (error) {
      // If there are foreign key constraints, provide a helpful error
      if (error.code === 'P2003') {
        throw new HttpException(
          'Cannot delete member with existing bookings or dependencies. Please delete related records first.',
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        'Failed to delete member',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMembers({ page, limit, search, status }) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { Membership_No: { contains: search } },
        { Name: { contains: search } },
      ];
    }
    if (status && status !== 'all') {
      const upperStatus = status.toUpperCase();
      if (['ACTIVE', 'DEACTIVATED', 'BLOCKED'].includes(upperStatus)) {
        where.Status = { equals: status.toLowerCase() };
      } else {
        where.Actual_Status = { equals: upperStatus };
      }
    }

    const [members, total] = await Promise.all([
      this.prismaService.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.member.count({ where }),
    ]);

    return {
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  async searchMembers(searchFor: string) {
    // Trim and avoid empty or too short searches
    const query = searchFor.trim();
    console.log(query);
    if (!query) return [];

    return await this.prismaService.member.findMany({
      where: {
        OR: [
          {
            Membership_No: {
              startsWith: query,
            },
          },
          {
            Name: {
              startsWith: query,
            },
          },
        ],
      },
      select: {
        Name: true,
        Balance: true,
        Membership_No: true,
        Actual_Status: true,
        Status: true,
        Sno: true,
      },
      orderBy: {
        Membership_No: 'asc',
      },
      take: 15,
    });
  }

  async checkMemberStatus(memberID: string){
    return await this.prismaService.member.findFirst({
      where: { Membership_No: memberID },
      select:{Status: true, Actual_Status: true}
    });
  }
}

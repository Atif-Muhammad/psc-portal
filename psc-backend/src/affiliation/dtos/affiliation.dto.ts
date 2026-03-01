import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { PaymentMode, PaymentStatus } from '@prisma/client';

export class CreateAffiliatedClubDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => Boolean)
  @IsNotEmpty()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  order?: number;
}

export class UpdateAffiliatedClubDto {
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => Boolean)
  @IsNotEmpty()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  order?: number;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateAffiliatedClubRequestDto {
  @IsNotEmpty({ message: 'membership number must be provided' })
  @Type(() => String)
  membershipNo: string;

  @IsNotEmpty({ message: 'affiliated club must be selected' })
  @Type(() => Number)
  affiliatedClubId: number;

  @IsNotEmpty({ message: 'requested date must be provided' })
  requestedDate: string;
}

export class UpdateRequestStatusDto {
  @IsNumber()
  id: number;

  @IsEnum(RequestStatus)
  status: RequestStatus;
}

export class CreateAffClubBookingCancellationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateAffClubBookingCancellationDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  adminRemarks?: string;
}
export class AffiliatedRoomBookingDto {
  @IsNotEmpty({ message: 'Affiliated club must be selected' })
  @Type(() => Number)
  @IsNumber()
  affiliatedClubId: number;

  @IsNotEmpty({ message: 'Affiliated membership number must be provided' })
  @IsString()
  affiliatedMembershipNo: string;

  @IsNotEmpty({ message: 'Total Price must be specified' })
  totalPrice: string;

  @IsEnum(PaymentStatus, {
    message: 'Payment status must be UNPAID, HALF_PAID, PAID, or TO_BILL',
  })
  paymentStatus: PaymentStatus;

  @IsEnum(PaymentMode, { message: 'payment mode must be provided' })
  paymentMode: PaymentMode;

  @IsOptional()
  paidAmount: string | number;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  selectedRoomIds?: string[];

  @IsOptional()
  numberOfAdults?: number;

  @IsOptional()
  numberOfChildren?: number;

  @IsOptional()
  specialRequests?: string;

  @IsOptional()
  guestName?: string;

  @IsOptional()
  guestContact?: string;

  @IsOptional()
  guestCNIC?: string;

  @IsOptional()
  heads?: { head: string; amount: number }[];

  @IsOptional()
  @IsString()
  transaction_id?: string;
  @IsOptional()
  @IsString()
  bank_name?: string;
  @IsOptional()
  @IsString()
  paid_at?: string;

  @IsOptional()
  @IsString()
  card_number?: string;

  @IsOptional()
  @IsString()
  check_number?: string;
}

export class UpdateAffiliatedRoomBookingDto extends AffiliatedRoomBookingDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  id: number;
}

import { IsNotEmpty, IsOptional } from 'class-validator';

export class PhotoShootDto {
  @IsOptional()
  id?: string;
  @IsOptional()
  description?: string;
  @IsNotEmpty({ message: 'Member Charges should be provided' })
  memberCharges: string;
  @IsNotEmpty({ message: 'Guest Charges should be provided' })
  guestCharges: string;
  @IsOptional()
  images?: string[];
  @IsOptional()
  existingimgs?: string[];
  @IsOptional()
  outOfOrders?: PhotoshootOutOfOrderDto[];
}

export class PhotoshootOutOfOrderDto {
  @IsOptional()
  id?: number;
  @IsNotEmpty({ message: 'reason must be provided' })
  reason: string;
  @IsNotEmpty({ message: 'start date must be provided' })
  startDate: string;
  @IsNotEmpty({ message: 'end date must be provided' })
  endDate: string;
}

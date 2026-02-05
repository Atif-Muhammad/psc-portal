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
  outOfOrders?: any[];
}

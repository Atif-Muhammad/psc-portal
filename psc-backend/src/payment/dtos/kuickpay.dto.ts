import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BillInquiryRequestDto {
  @IsNotEmpty()
  @IsString()
  consumer_number: string;

  @IsOptional()
  bank_mnemonic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reserved?: string;
}

export class BillPaymentRequestDto {
  @IsNotEmpty()
  @IsString()
  consumer_number: string;

  @IsNotEmpty()
  @IsString()
  tran_auth_id: string;

  @IsNotEmpty()
  @IsString()
  transaction_amount: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(8)
  tran_date: string; // YYYYMMDD

  @IsNotEmpty()
  @IsString()
  @MaxLength(6)
  tran_time: string; // HHMMSS

  @IsOptional()
  bank_mnemonic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reserved?: string;
}

export interface BillInquiryResponse {
  response_Code: string;
  consumer_Detail: string;
  bill_status: 'U' | 'P' | 'B' | 'T';
  due_date: string;
  amount_within_dueDate: string;
  amount_after_dueDate: string;
  email_address: string;
  contact_number: string;
  billing_month: string;
  date_paid: string;
  amount_paid: string;
  tran_auth_Id: string;
  reserved: string;
}

export interface BillPaymentResponse {
  response_Code: string;
  Identification_parameter: string;
  reserved: string;
}

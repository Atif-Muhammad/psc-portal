import { IsEnum, IsNotEmpty, IsNumber, isString, IsString } from 'class-validator';
import { FeedbackStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateFeedbackStatusDto {
    @IsEnum(FeedbackStatus)
    status: FeedbackStatus;
}

export class AddFeedbackRemarkDto {
    @IsString()
    @IsNotEmpty()
    remark: string;

    @IsString()
    @IsNotEmpty()
    adminName: string;
}

export class CreateFeedbackCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class CreateFeedbackSubCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}


export class CreateFeedbackDto {

    @IsString()
    subject: string
    
    @IsNumber()
    @Type(() => Number)
    categoryId: number
    
    @IsNumber()
    @Type(() => Number)
    subCategoryId: number

    @IsString()
    message: string
}
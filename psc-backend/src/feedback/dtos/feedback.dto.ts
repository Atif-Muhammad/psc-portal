import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FeedbackStatus } from '@prisma/client';

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

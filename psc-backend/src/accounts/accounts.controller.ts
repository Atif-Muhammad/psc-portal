import {
    Controller,
    Post,
    Get,
    UseInterceptors,
    UploadedFile,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountsService } from './accounts.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Post('upload-bills')
    @UseGuards(JwtAccGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadBills(
        @Body('month') month: string,
        @Body('year') year: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.accountsService.uploadBills(month, year, file);
    }

    @Get('bills')
    @UseGuards(JwtAccGuard)
    async getBills(
        @Query('membershipNo') membershipNo: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return this.accountsService.getBills(membershipNo, month, year);
    }

    @Get('latest-bill')
    @UseGuards(JwtAccGuard)
    async getLatestBill(@Query('membershipNo') membershipNo: string) {
        return this.accountsService.getLatestBill(membershipNo);
    }

    @Get('list-bills')
    @UseGuards(JwtAccGuard)
    async listBills(@Query('month') month: string, @Query('year') year: string) {
        return this.accountsService.listBills(month, year);
    }
}

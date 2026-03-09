import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAccGuard } from 'src/common/guards/jwt-access.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesEnum } from 'src/common/constants/roles.enum';

@Controller('search')
@UseGuards(JwtAccGuard, RolesGuard)
@Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN)
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    async unifiedSearch(@Query('q') query: string) {
        return await this.searchService.unifiedSearch(query);
    }

    @Get('booking')
    async getUnifiedBooking(
        @Query('type') type: string,
        @Query('id') id: string
    ) {
        return await this.searchService.getUnifiedBooking(type, parseInt(id));
    }
}

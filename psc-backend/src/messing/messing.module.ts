import { Module } from '@nestjs/common';
import { MessingController } from './messing.controller';
import { MessingService } from './messing.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [MessingController],
  providers: [MessingService],
})
export class MessingModule {}

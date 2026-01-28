import { Module } from '@nestjs/common';
import { PhotoshootController } from './photoshoot.controller';
import { PhotoshootService } from './photoshoot.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [PhotoshootController],
  providers: [PhotoshootService],
})
export class PhotoshootModule {}

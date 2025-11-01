import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}

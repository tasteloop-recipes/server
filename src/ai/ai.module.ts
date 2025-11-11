import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { objectStorageProvider } from '../storage/object-storage.provider';
import { AiService } from './ai.service';
import { openAiProvider } from './providers/openai.provider';

@Module({
  imports: [PrismaModule],
  providers: [AiService, openAiProvider, objectStorageProvider],
  exports: [AiService],
})
export class AiModule {}

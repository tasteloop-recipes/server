import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { openAiProvider } from './providers/openai.provider';

@Module({
  providers: [AiService, openAiProvider],
  exports: [AiService],
})
export class AiModule {}

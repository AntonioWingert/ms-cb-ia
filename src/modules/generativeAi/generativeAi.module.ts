import { Module } from '@nestjs/common';
import { GenerativeAiService } from './generativeAi.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Module({
  providers: [GenerativeAiService, GoogleGenerativeAI],
  exports: [GenerativeAiService, GoogleGenerativeAI],
})
export class GenerativeAiModule {}

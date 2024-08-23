import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { GenerativeAiService } from '../generativeAi/generativeAi.service';
import { GenerativeAiModule } from '../generativeAi/generativeAi.module';
import { ScheduleService } from '../schedules/schedule.service';
import { ApiModule } from '../api/api.module';

@Module({
  imports: [GenerativeAiModule, ApiModule],
  providers: [WhatsappService, GenerativeAiService, ScheduleService],
  exports: [WhatsappService],
})
export class WhatsappModule {}

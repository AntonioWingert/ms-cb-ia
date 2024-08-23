import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './modules/api/api.module';
import { ApiService } from './modules/api/api.service';
import { SchedulesModule } from './modules/schedules/schedule.module';
import { ScheduleService } from './modules/schedules/schedule.service';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WhatsappService } from './modules/whatsapp/whatsapp.service';
import { GenerativeAiModule } from './modules/generativeAi/generativeAi.module';
import { GenerativeAiService } from './modules/generativeAi/generativeAi.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ApiModule,
    SchedulesModule,
    WhatsappModule,
    GenerativeAiModule,
  ],
  controllers: [],
  providers: [
    ApiService,
    ScheduleService,
    WhatsappService,
    GenerativeAiService,
  ],
})
export class AppModule {}

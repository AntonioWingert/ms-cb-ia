import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ApiService } from '../api/api.service';
import { ApiModule } from '../api/api.module';

@Module({
  imports: [ApiModule],
  providers: [ScheduleService, ApiService],
  exports: [ScheduleService],
})
export class SchedulesModule {}

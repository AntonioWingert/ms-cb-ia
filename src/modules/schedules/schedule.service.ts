import { Injectable } from '@nestjs/common';
import { formatScheduleDataToString } from 'src/common/utils/formatSchedule';
import { ApiService } from '../api/api.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly apiService: ApiService) {}

  async getSchedules() {
    const data = await this.apiService.getSchedules();
    return formatScheduleDataToString(data);
  }
}

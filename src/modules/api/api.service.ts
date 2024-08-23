import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  async getSchedules() {
    const data = await fetch(
      'http://localhost:5678/webhook/73b382dc-e678-49d6-a31a-7b5e41ce1236',
    );
    const dataJson = await data.json();
    return dataJson;
  }
}

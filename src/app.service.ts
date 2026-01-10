import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'swirl-engine-backend',
      timestamp: new Date().toISOString(),
    };
  }
}


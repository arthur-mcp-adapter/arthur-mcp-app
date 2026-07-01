import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface HealthResponse {
  status: 'ok';
  service: string;
  uptime: number;
  timestamp: string;
  version: string;
}

@Controller()
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  health(): HealthResponse {
    return this.response();
  }

  @Get('ready')
  ready(): HealthResponse {
    return this.response();
  }

  @Get('live')
  live(): HealthResponse {
    return this.response();
  }

  private response(): HealthResponse {
    return {
      status: 'ok',
      service: this.configService.get<string>('SERVICE_NAME', process.env.SERVICE_NAME ?? 'arthur-mcp-adapter'),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: this.configService.get<string>('SERVICE_VERSION', process.env.SERVICE_VERSION ?? '1.0.0'),
    };
  }
}

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: 'ok';
  service: string;
  uptime: number;
  timestamp: string;
  version: string;
}

@Controller()
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  health(): HealthResponse {
    return this.response();
  }

  // Readiness gates rolling updates: it must only pass once the database is
  // reachable, otherwise Kubernetes routes traffic to a pod that cannot serve.
  @Get('ready')
  async ready(): Promise<HealthResponse> {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('database connection not initialized');
    }
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('database connection unavailable');
    }
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

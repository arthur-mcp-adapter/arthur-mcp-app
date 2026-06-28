import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics/metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get(process.env.PROMETHEUS_METRICS_PATH?.replace(/^\//, '') || 'metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return this.metricsService.renderMetrics();
  }
}

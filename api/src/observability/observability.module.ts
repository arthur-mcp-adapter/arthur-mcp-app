import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppLoggerService } from './logger/app-logger.service';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware';
import { MetricsController } from './metrics.controller';
import { HealthController } from './health.controller';
import { MetricsService } from './metrics/metrics.service';
import { prometheusRegistryProvider } from './metrics/prometheus.registry';
import { CorrelationIdMiddleware } from './middlewares/correlation-id.middleware';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { TracingService } from './tracing/tracing.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController, MetricsController],
  providers: [
    AppLoggerService,
    RequestLoggerMiddleware,
    CorrelationIdMiddleware,
    prometheusRegistryProvider,
    MetricsService,
    TracingService,
    { provide: APP_INTERCEPTOR, useClass: TracingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [AppLoggerService, MetricsService, TracingService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}

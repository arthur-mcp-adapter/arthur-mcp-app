import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { SpaFilter } from './common/filters/spa.filter';
import { AppLoggerService } from './observability/logger/app-logger.service';
import { initializeOpenTelemetry } from './observability/tracing/otel.config';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  initializeOpenTelemetry();

  const logger = new AppLoggerService();

  const app = await NestFactory.create(AppModule, { logger });

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true; // allow all origins if CORS_ORIGIN is not set
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Global prefix /api — excludes MCP and health endpoints (accessed directly)
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health',      method: RequestMethod.ALL },
      { path: 'ready',       method: RequestMethod.ALL },
      { path: 'live',        method: RequestMethod.ALL },
      { path: 'metrics',     method: RequestMethod.ALL },
      { path: 'mcp/*',                              method: RequestMethod.ALL },
      { path: 'mcp-docs',                           method: RequestMethod.ALL },
      { path: 'mcp-docs/*',                         method: RequestMethod.ALL },
      { path: 'oauth/*',                                method: RequestMethod.ALL },
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.ALL },
    ],
  });

  app.enableShutdownHooks();

  // Serve Vite build static files (used when nginx is not in front)
  const publicPath = join(__dirname, 'public');
  app.use(express.static(publicPath));

  // SPA fallback: React Router routes (e.g. /dashboard) return index.html
  app.useGlobalFilters(new SpaFilter());

  const port = parseInt(process.env.PORT, 10) || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`MCP server started on :${port}`, 'Bootstrap');
}

bootstrap();

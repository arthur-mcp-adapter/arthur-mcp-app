import 'reflect-metadata';
import 'pg';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { SpaFilter } from './common/filters/spa.filter';
import { AppLoggerService } from './observability/logger/app-logger.service';
import { ErrorTrackingService } from './error-tracking/error-tracking.service';

/**
 * Entry point for the Vercel serverless deployment. Distinct from main.ts
 * (used by Docker/Render, which run a persistent process): here the Nest app
 * is created once per cold start and its underlying Express instance is
 * cached across warm invocations, since app.listen() has no meaning in a
 * serverless function. Static asset serving is skipped — on Vercel the
 * frontend build is served directly by the platform, and vercel.json only
 * routes API/MCP/OAuth/health paths to this function. `@nestjs/schedule`'s
 * @Cron does not fire reliably here because the process isn't persistent;
 * the weekly digest instead runs via Vercel Cron hitting
 * DigestCronController (see api/src/email/digest-cron.controller.ts).
 */
let cachedApp: Express | undefined;

async function bootstrap(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const logger = new AppLoggerService();
  const app = await NestFactory.create(AppModule, { logger });

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'ready', method: RequestMethod.ALL },
      { path: 'live', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
      { path: 'mcp/*', method: RequestMethod.ALL },
      { path: 'mcp-docs', method: RequestMethod.ALL },
      { path: 'mcp-docs/*', method: RequestMethod.ALL },
      { path: 'oauth/*', method: RequestMethod.ALL },
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalFilters(new SpaFilter(app.get(ErrorTrackingService)));

  await app.init();

  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await bootstrap();
  app(req, res);
}

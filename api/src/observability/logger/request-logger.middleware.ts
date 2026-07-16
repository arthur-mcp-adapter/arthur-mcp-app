import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { AppLoggerService } from './app-logger.service';
import type { CorrelatedRequest } from '../middlewares/correlation-id.middleware';
import { redactSensitiveQueryParams } from '../../common/redact-sensitive-query-params.util';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const statusCode = res.statusCode;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      this.logger.write(level, {
        message: 'HTTP request completed',
        requestId: req.correlation?.requestId,
        correlationId: req.correlation?.correlationId,
        traceId: req.correlation?.traceId,
        method: req.method,
        path: redactSensitiveQueryParams(req.originalUrl ?? req.url),
        statusCode,
        durationMs: Math.round(durationMs),
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
    });

    next();
  }
}

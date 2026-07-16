import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { TracingService } from '../tracing/tracing.service';
import { redactSensitiveQueryParams } from '../../common/redact-sensitive-query-params.util';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.tracingService.enabled) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const span = this.tracingService.startSpan(`HTTP ${req.method} ${req.path}`, {
      attributes: {
        'http.method': req.method,
        'http.route': req.route?.path ?? req.path,
        'http.target': redactSensitiveQueryParams(req.originalUrl ?? req.url),
      },
    });

    return next.handle().pipe(
      catchError((error) => {
        span?.recordException(error);
        span?.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
        throw error;
      }),
      finalize(() => {
        span?.setAttribute('http.status_code', res.statusCode);
        if (res.statusCode >= 500) span?.setStatus({ code: SpanStatusCode.ERROR });
        span?.end();
        const activeSpan = trace.getActiveSpan();
        activeSpan?.setAttribute('http.status_code', res.statusCode);
      }),
    );
  }
}

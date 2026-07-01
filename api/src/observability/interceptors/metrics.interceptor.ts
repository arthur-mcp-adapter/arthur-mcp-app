import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
        this.metricsService.recordHttpRequest({
          method: req.method,
          route: this.routeLabel(req),
          status_code: String(res.statusCode),
        }, durationSeconds);
      }),
    );
  }

  private routeLabel(req: Request): string {
    const routePath = (req.route?.path ?? req.path ?? req.url) as string;
    const baseUrl = req.baseUrl ?? '';
    return `${baseUrl}${routePath}` || 'unknown';
  }
}

import { Injectable } from '@nestjs/common';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span, SpanOptions } from '@opentelemetry/api';
import { isTracingEnabled } from './otel.config';

@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME ?? process.env.SERVICE_NAME ?? 'arthur-mcp-adapter');

  get enabled(): boolean {
    return isTracingEnabled();
  }

  startSpan(name: string, options?: SpanOptions): Span | undefined {
    if (!this.enabled) return undefined;
    return this.tracer.startSpan(name, options);
  }

  async runInSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean | undefined>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const span = this.startSpan(name, { attributes });
    if (!span) return fn();

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  currentTraceId(): string | undefined {
    return trace.getActiveSpan()?.spanContext().traceId;
  }
}

import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export interface CorrelationContext {
  requestId: string;
  correlationId: string;
  traceId: string;
}

export interface CorrelatedRequest extends Request {
  correlation?: CorrelationContext;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const requestId = firstHeader(req.headers['x-request-id']) ?? createId('req');
    const correlationId = firstHeader(req.headers['x-correlation-id']) ?? requestId;
    const traceId = firstHeader(req.headers['traceparent'])?.split('-')[1] ?? createId('trace');
    const context: CorrelationContext = { requestId, correlationId, traceId };

    req.correlation = context;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-trace-id', traceId);

    storage.run(context, next);
  }
}

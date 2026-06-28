import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import { getCorrelationContext } from '../middlewares/correlation-id.middleware';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface StructuredLogEntry {
  timestamp?: string;
  level?: LogLevel;
  message: string;
  service?: string;
  environment?: string;
  version?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userAgent?: string;
  ip?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  context?: string;
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly version: string;
  private readonly structuredLogs: boolean;
  private readonly logLevel: LogLevel;

  constructor(configService?: ConfigService) {
    this.serviceName = configService?.get<string>('SERVICE_NAME') ?? process.env.SERVICE_NAME ?? 'arthur-mcp-adapter';
    this.environment = configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    this.version = configService?.get<string>('SERVICE_VERSION') ?? process.env.SERVICE_VERSION ?? '1.0.0';
    this.structuredLogs = (configService?.get<string>('ENABLE_STRUCTURED_LOGS') ?? process.env.ENABLE_STRUCTURED_LOGS ?? 'true') !== 'false';
    this.logLevel = this.normalizeLevel(configService?.get<string>('LOG_LEVEL') ?? process.env.LOG_LEVEL ?? 'info');
  }

  log(message: unknown, context?: string): void {
    this.emit('info', message, context);
  }

  warn(message: unknown, context?: string): void {
    this.emit('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.emit('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.emit('verbose', message, context);
  }

  error(message: unknown, traceOrStack?: string, context?: string): void {
    const payload = this.toEntry(message);
    if (traceOrStack && !payload.stack) payload.stack = traceOrStack;
    this.emit('error', payload, context);
  }

  write(level: LogLevel, entry: StructuredLogEntry): void {
    this.emit(level, entry);
  }

  private emit(level: LogLevel, message: unknown, context?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.enrich({ ...this.toEntry(message), level, context });
    const line = this.structuredLogs ? JSON.stringify(entry) : this.formatPretty(entry);
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  }

  private enrich(entry: StructuredLogEntry): StructuredLogEntry {
    const correlation = getCorrelationContext();
    const spanContext = trace.getActiveSpan()?.spanContext();

    return {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      level: entry.level ?? 'info',
      service: entry.service ?? this.serviceName,
      environment: entry.environment ?? this.environment,
      version: entry.version ?? this.version,
      ...(correlation?.requestId && !entry.requestId ? { requestId: correlation.requestId } : {}),
      ...(correlation?.correlationId && !entry.correlationId ? { correlationId: correlation.correlationId } : {}),
      ...(spanContext?.traceId && !entry.traceId ? { traceId: spanContext.traceId } : correlation?.traceId && !entry.traceId ? { traceId: correlation.traceId } : {}),
      ...entry,
    };
  }

  private toEntry(message: unknown): StructuredLogEntry {
    if (message instanceof Error) {
      return {
        message: message.message,
        errorName: message.name,
        errorMessage: message.message,
        stack: message.stack,
      };
    }

    if (typeof message === 'object' && message !== null) {
      const record = message as Record<string, unknown>;
      return {
        ...record,
        message: typeof record.message === 'string' ? record.message : String(record.event ?? 'Log event'),
      } as StructuredLogEntry;
    }

    return { message: String(message) };
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.logLevel];
  }

  private normalizeLevel(level: string): LogLevel {
    return (['error', 'warn', 'info', 'debug', 'verbose'].includes(level) ? level : 'info') as LogLevel;
  }

  private formatPretty(entry: StructuredLogEntry): string {
    const fields = Object.entries(entry)
      .filter(([key, value]) => !['timestamp', 'level', 'message'].includes(key) && value !== undefined)
      .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(' ');
    return `${entry.timestamp} ${entry.level?.toUpperCase()} ${entry.message}${fields ? ` ${fields}` : ''}`;
  }
}

import { EventEmitter } from 'events';
import { RequestLoggerMiddleware } from './request-logger.middleware';
import { AppLoggerService } from './app-logger.service';

describe('RequestLoggerMiddleware', () => {
  it('logs structured HTTP completion details on finish', () => {
    const logger = { write: jest.fn() } as unknown as AppLoggerService;
    const middleware = new RequestLoggerMiddleware(logger);
    const req: any = {
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
      ip: '127.0.0.1',
      correlation: { requestId: 'req-1', correlationId: 'corr-1', traceId: 'trace-1' },
      get: jest.fn().mockReturnValue('jest-agent'),
    };
    const res: any = new EventEmitter();
    res.statusCode = 200;
    const next = jest.fn();

    middleware.use(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(logger.write).toHaveBeenCalledWith('info', expect.objectContaining({
      message: 'HTTP request completed',
      requestId: 'req-1',
      traceId: 'trace-1',
      method: 'GET',
      path: '/health',
      statusCode: 200,
      userAgent: 'jest-agent',
      ip: '127.0.0.1',
    }));
  });

  it('uses error log level for 5xx responses', () => {
    const logger = { write: jest.fn() } as unknown as AppLoggerService;
    const middleware = new RequestLoggerMiddleware(logger);
    const req: any = { method: 'POST', url: '/api/fail', get: jest.fn(), ip: '127.0.0.1' };
    const res: any = new EventEmitter();
    res.statusCode = 503;

    middleware.use(req, res, jest.fn());
    res.emit('finish');

    expect(logger.write).toHaveBeenCalledWith('error', expect.objectContaining({ statusCode: 503 }));
  });
});

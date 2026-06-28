import { EventEmitter } from 'events';
import { CorrelationIdMiddleware, getCorrelationContext } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  it('reuses incoming ids and exposes them through async context and response headers', (done) => {
    const middleware = new CorrelationIdMiddleware();
    const req: any = {
      headers: {
        'x-request-id': 'req-incoming',
        'x-correlation-id': 'corr-incoming',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      },
    };
    const res: any = new EventEmitter();
    res.setHeader = jest.fn();

    middleware.use(req, res, () => {
      expect(req.correlation).toEqual({
        requestId: 'req-incoming',
        correlationId: 'corr-incoming',
        traceId: '1234567890abcdef1234567890abcdef',
      });
      expect(getCorrelationContext()).toEqual(req.correlation);
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'req-incoming');
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-incoming');
      expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', '1234567890abcdef1234567890abcdef');
      done();
    });
  });

  it('generates request and correlation ids when headers are absent', (done) => {
    const middleware = new CorrelationIdMiddleware();
    const req: any = { headers: {} };
    const res: any = new EventEmitter();
    res.setHeader = jest.fn();

    middleware.use(req, res, () => {
      expect(req.correlation.requestId).toMatch(/^req_/);
      expect(req.correlation.correlationId).toBe(req.correlation.requestId);
      expect(req.correlation.traceId).toMatch(/^trace_/);
      done();
    });
  });
});

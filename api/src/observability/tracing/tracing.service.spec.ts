import { TracingService } from './tracing.service';

describe('TracingService', () => {
  const previousEnableTracing = process.env.ENABLE_TRACING;
  const previousEnableObservability = process.env.ENABLE_OBSERVABILITY;

  afterEach(() => {
    process.env.ENABLE_TRACING = previousEnableTracing;
    process.env.ENABLE_OBSERVABILITY = previousEnableObservability;
  });

  it('runs normally without creating spans when tracing is disabled', async () => {
    process.env.ENABLE_TRACING = 'false';
    process.env.ENABLE_OBSERVABILITY = 'true';
    const service = new TracingService();

    await expect(service.runInSpan('test.span', {}, async () => 'ok')).resolves.toBe('ok');
    expect(service.enabled).toBe(false);
  });

  it('reports tracing enabled from environment without requiring application startup', () => {
    process.env.ENABLE_TRACING = 'true';
    process.env.ENABLE_OBSERVABILITY = 'true';
    const service = new TracingService();

    expect(service.enabled).toBe(true);
  });

  it('disables tracing when observability is disabled', () => {
    process.env.ENABLE_TRACING = 'true';
    process.env.ENABLE_OBSERVABILITY = 'false';
    const service = new TracingService();

    expect(service.enabled).toBe(false);
  });
});

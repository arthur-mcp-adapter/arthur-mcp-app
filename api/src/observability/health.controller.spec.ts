import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

describe('Observability HealthController', () => {
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      if (key === 'SERVICE_NAME') return 'arthur-mcp-adapter';
      if (key === 'SERVICE_VERSION') return '1.0.0';
      return fallback;
    }),
  } as unknown as ConfigService;

  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController(config);
  });

  it.each(['health', 'ready', 'live'] as const)('returns the standard %s response', (method) => {
    const response = controller[method]();

    expect(response).toEqual(expect.objectContaining({
      status: 'ok',
      service: 'arthur-mcp-adapter',
      version: '1.0.0',
    }));
    expect(response.uptime).toEqual(expect.any(Number));
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });
});

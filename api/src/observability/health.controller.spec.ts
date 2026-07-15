import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('Observability HealthController', () => {
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      if (key === 'SERVICE_NAME') return 'arthur-mcp-adapter';
      if (key === 'SERVICE_VERSION') return '1.0.0';
      return fallback;
    }),
  } as unknown as ConfigService;

  let query: jest.Mock;
  let dataSource: DataSource;
  let controller: HealthController;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([{ '1': 1 }]);
    dataSource = { isInitialized: true, query } as unknown as DataSource;
    controller = new HealthController(config, dataSource);
  });

  it.each(['health', 'live'] as const)('returns the standard %s response', (method) => {
    const response = controller[method]();

    expect(response).toEqual(expect.objectContaining({
      status: 'ok',
      service: 'arthur-mcp-adapter',
      version: '1.0.0',
    }));
    expect(response.uptime).toEqual(expect.any(Number));
    expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
  });

  it('returns the standard ready response when the database responds', async () => {
    const response = await controller.ready();

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(response).toEqual(expect.objectContaining({
      status: 'ok',
      service: 'arthur-mcp-adapter',
      version: '1.0.0',
    }));
  });

  it('fails readiness when the data source is not initialized', async () => {
    dataSource = { isInitialized: false, query } as unknown as DataSource;
    controller = new HealthController(config, dataSource);

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
  });

  it('fails readiness when the database query fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
  });
});

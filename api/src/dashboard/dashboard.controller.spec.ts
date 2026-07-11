import { BadRequestException } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  const dashboard = {
    getStats: jest.fn(),
    getHealthSummary: jest.fn(),
  } as unknown as jest.Mocked<Pick<DashboardService, 'getStats' | 'getHealthSummary'>>;

  let controller: DashboardController;
  const req = { user: { userId: 'owner-1' } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(dashboard as unknown as DashboardService);
  });

  it('passes explicit date range to the service', async () => {
    const result = { calls: { total: 1 } };
    dashboard.getStats.mockResolvedValue(result as any);

    await expect(controller.getStats(req, '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')).resolves.toBe(result);

    expect(dashboard.getStats).toHaveBeenCalledWith(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
      'owner-1',
    );
  });

  it('uses last 24 hours when no dates are provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    dashboard.getStats.mockResolvedValue({} as any);

    await controller.getStats(req);

    expect(dashboard.getStats).toHaveBeenCalledWith(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-02T00:00:00.000Z'),
      'owner-1',
    );
    jest.useRealTimers();
  });

  it('rejects invalid dates', () => {
    expect(() => controller.getStats(req, 'not-a-date', '2026-01-02T00:00:00.000Z')).toThrow(BadRequestException);
  });

  it('requires from to be before to', () => {
    expect(() => controller.getStats(req, '2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toThrow(BadRequestException);
  });

  it('returns health summary from the service', async () => {
    const summary = [{ serverId: 'server-1' }];
    dashboard.getHealthSummary.mockResolvedValue(summary as any);

    await expect(controller.getHealthSummary(req)).resolves.toBe(summary);
  });
});

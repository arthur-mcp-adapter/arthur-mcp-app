import { DashboardService } from './dashboard.service';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from '../swagger/swagger-project.repository';
import { ExecutionLogsService, LogEntry } from '../execution-logs/execution-logs.service';

const project = (override: Partial<SwaggerProjectRecord> = {}): SwaggerProjectRecord => ({
  _id: 'server-1',
  name: 'Payments',
  baseUrl: 'https://api.example.com',
  tools: [],
  auth: { type: 'none' },
  status: 'active',
  mcpApiKeys: [],
  resources: [],
  prompts: [],
  chains: [],
  tags: [],
  rateLimit: { enabled: false, requestsPerMinute: 60 },
  isPaused: false,
  maintenanceMode: { enabled: false, message: '' },
  availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
  alertConfig: { enabled: false, errorThresholdPct: 10, notifyEmail: '' },
  ...override,
});

const log = (override: Partial<LogEntry> = {}): LogEntry => ({
  id: 'log-1',
  serverId: 'server-1',
  serverName: 'Payments',
  toolName: 'list_payments',
  source: 'mcp',
  statusCode: 200,
  responseTimeMs: 50,
  isError: false,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  ...override,
});

describe('DashboardService', () => {
  const projectRepo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findAll'>> = {
    findAll: jest.fn(),
  };
  const executionLogs: jest.Mocked<Pick<ExecutionLogsService, 'getInRange' | 'getHealthSummary'>> = {
    getInRange: jest.fn(),
    getHealthSummary: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      projectRepo as unknown as ISwaggerProjectRepository,
      executionLogs as unknown as ExecutionLogsService,
    );
  });

  it('summarizes projects, tools, calls, errors, top tools, and hourly buckets', async () => {
    executionLogs.getInRange.mockReturnValue([
      log({ id: '1', toolName: 'list_payments', createdAt: new Date('2026-01-01T10:15:00.000Z') }),
      log({ id: '2', toolName: 'list_payments', createdAt: new Date('2026-01-01T10:30:00.000Z'), isError: true }),
      log({ id: '3', toolName: 'get_customer', createdAt: new Date('2026-01-01T11:00:00.000Z') }),
    ]);
    projectRepo.findAll.mockResolvedValue([
      project({ _id: 'server-1', tools: [{ name: 'list_payments' } as any], mcpApiKey: 'legacy-key', tags: ['source:rest'] }),
      project({ _id: 'server-2', name: 'Inventory', status: 'paused', tools: [{ name: 'get_stock' } as any, { name: 'set_stock' } as any] }),
    ]);

    const stats = await service.getStats(
      new Date('2026-01-01T10:00:00.000Z'),
      new Date('2026-01-01T12:00:00.000Z'),
      'owner-1',
    );

    expect(stats.projects).toEqual({ total: 2, withApiKey: 1, active: 1 });
    expect(stats.tools.total).toBe(3);
    expect(stats.calls).toEqual({ total: 3, errors: 1, successRate: 67 });
    expect(stats.topTools[0]).toMatchObject({ toolName: 'list_payments', count: 2, serverName: 'Payments' });
    expect(stats.callsByBucket).toEqual([
      { _id: '2026-01-01T10:00', calls: 2, errors: 1 },
      { _id: '2026-01-01T11:00', calls: 1, errors: 0 },
    ]);
    expect(stats.recentProjects).toHaveLength(2);
  });

  it('uses daily buckets and returns 100 percent success for empty periods', async () => {
    executionLogs.getInRange.mockReturnValue([]);
    projectRepo.findAll.mockResolvedValue([]);

    const stats = await service.getStats(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-10T00:00:00.000Z'),
      'owner-1',
    );

    expect(stats.calls.successRate).toBe(100);
    expect(stats.callsByBucket).toEqual([]);
  });

  it('maps project health summary defaults and log-derived values', async () => {
    const lastCallAt = new Date('2026-01-01T10:00:00.000Z');
    projectRepo.findAll.mockResolvedValue([
      project({ _id: 'server-1', name: 'Payments', isPaused: true }),
      project({ _id: 'server-2', name: 'Inventory' }),
    ]);
    executionLogs.getHealthSummary.mockReturnValue(new Map([
      ['server-1', { errorRatePct: 25, totalCalls: 4, lastCallAt }],
    ]));

    await expect(service.getHealthSummary('owner-1')).resolves.toEqual([
      { serverId: 'server-1', serverName: 'Payments', isPaused: true, errorRatePct: 25, totalCalls: 4, lastCallAt },
      { serverId: 'server-2', serverName: 'Inventory', isPaused: false, errorRatePct: -1, totalCalls: 0, lastCallAt: undefined },
    ]);
    expect(executionLogs.getHealthSummary).toHaveBeenCalledWith(['server-1', 'server-2']);
  });
});

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsController', () => {
  const service = {
    findAll: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<Pick<AuditLogsService, 'findAll' | 'count'>>;

  let controller: AuditLogsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogsController(service as unknown as AuditLogsService);
  });

  it('returns logs with total and parsed pagination', async () => {
    const logs = [{ id: 'log-1', username: 'alex', action: 'create', entity: 'server', createdAt: new Date() }];
    service.findAll.mockResolvedValue(logs as any);
    service.count.mockResolvedValue(3);

    await expect(controller.findAll('25', '10')).resolves.toEqual({
      logs,
      total: 3,
      limit: 25,
      skip: 10,
    });
    expect(service.findAll).toHaveBeenCalledWith(25, 10);
  });

  it('uses defaults and caps large limits', async () => {
    service.findAll.mockResolvedValue([]);
    service.count.mockResolvedValue(0);

    await expect(controller.findAll('999', undefined)).resolves.toMatchObject({
      limit: 200,
      skip: 0,
    });
    expect(service.findAll).toHaveBeenCalledWith(200, 0);
  });
});

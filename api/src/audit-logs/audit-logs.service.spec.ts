import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  beforeEach(() => {
    service = new AuditLogsService();
  });

  it('stores audit entries with generated id and timestamp', async () => {
    service.log({
      userId: 'user-1',
      username: 'alex',
      action: 'create',
      entity: 'server',
      entityId: 'server-1',
      entityName: 'Payments',
      ip: '127.0.0.1',
    });

    const entries = await service.findAll();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      userId: 'user-1',
      username: 'alex',
      action: 'create',
      entity: 'server',
      entityId: 'server-1',
      entityName: 'Payments',
      ip: '127.0.0.1',
    });
    expect(entries[0].id).toEqual(expect.any(String));
    expect(entries[0].createdAt).toBeInstanceOf(Date);
  });

  it('returns entries newest first and applies pagination', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    service.log({ username: 'a', action: 'first', entity: 'server' });

    jest.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));
    service.log({ username: 'a', action: 'second', entity: 'server' });

    jest.setSystemTime(new Date('2026-01-01T00:02:00.000Z'));
    service.log({ username: 'a', action: 'third', entity: 'server' });

    const entries = await service.findAll(1, 1);

    expect(entries.map((entry) => entry.action)).toEqual(['second']);
    expect(await service.count()).toBe(3);

    jest.useRealTimers();
  });
});

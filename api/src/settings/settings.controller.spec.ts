import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PERMISSION_KEY } from '../common/decorators/require-permission.decorator';

describe('SettingsController', () => {
  const settings = {
    getSafe: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Pick<SettingsService, 'getSafe' | 'update'>>;

  const auditLogs = {
    log: jest.fn(),
  } as unknown as jest.Mocked<Pick<AuditLogsService, 'log'>>;

  let controller: SettingsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SettingsController(
      settings as unknown as SettingsService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('returns safe settings', async () => {
    const safeSettings = { key: 'global', smtpPassSet: true };
    settings.getSafe.mockResolvedValue(safeSettings as any);

    await expect(controller.get()).resolves.toBe(safeSettings);
  });

  it('updates settings and records an audit log', async () => {
    const updated = { key: 'global', defaultTimeoutMs: 10000 };
    settings.update.mockResolvedValue(updated as any);

    await expect(controller.update({
      user: { userId: 'user-1', username: 'alex' },
      ip: '127.0.0.1',
    }, { defaultTimeoutMs: 10000 })).resolves.toBe(updated);

    expect(settings.update).toHaveBeenCalledWith({ defaultTimeoutMs: 10000 });
    expect(auditLogs.log).toHaveBeenCalledWith({
      userId: 'user-1',
      username: 'alex',
      action: 'update',
      entity: 'settings',
      entityName: 'System settings',
      ip: '127.0.0.1',
    });
  });

  it('requires settings_manage to update settings', () => {
    const permission = Reflect.getMetadata(PERMISSION_KEY, controller.update);

    expect(permission).toBe('settings_manage');
  });
});

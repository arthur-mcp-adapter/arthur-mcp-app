import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports jwtSecretConfigured false when using the insecure default', () => {
    delete process.env.JWT_SECRET;
    const snapshot = new SettingsService().getSnapshot();
    expect(snapshot.jwtSecretConfigured).toBe(false);
  });

  it('reports jwtSecretConfigured true and smtp.configured true when env vars are set', () => {
    process.env.JWT_SECRET = 'a-real-production-secret-value';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.GLOBAL_REQUEST_HEADERS = JSON.stringify([{ name: 'X-Foo', value: 'bar' }]);

    const snapshot = new SettingsService().getSnapshot();

    expect(snapshot.jwtSecretConfigured).toBe(true);
    expect(snapshot.smtp.configured).toBe(true);
    expect(snapshot.smtp.host).toBe('smtp.example.com');
    expect(snapshot.globalRequestHeaders).toEqual([{ name: 'X-Foo', value: 'bar' }]);
  });

  it('smtp.configured is false when only host is set (no user)', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    delete process.env.SMTP_USER;
    const snapshot = new SettingsService().getSnapshot();
    expect(snapshot.smtp.configured).toBe(false);
  });
});

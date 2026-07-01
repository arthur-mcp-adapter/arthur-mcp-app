import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { OAuthService } from './oauth.service';
import { UsersService } from '../users/users.service';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';

const jwtSecret = 'test-jwt-secret-value';

const server = (override: Partial<SwaggerProjectRecord> = {}): SwaggerProjectRecord => ({
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
  oauthClientId: 'client-id',
  oauthClientSecret: 'client-secret',
  tags: [],
  rateLimit: { enabled: false, requestsPerMinute: 60 },
  isPaused: false,
  maintenanceMode: { enabled: false, message: '' },
  availabilityWindow: { enabled: false, timezone: 'UTC', schedule: [] },
  alertConfig: { enabled: false, errorThresholdPct: 10, notifyEmail: '' },
  ...override,
});

describe('OAuthService', () => {
  const users: jest.Mocked<Pick<UsersService, 'findByUsername' | 'validatePassword'>> = {
    findByUsername: jest.fn(),
    validatePassword: jest.fn(),
  };
  const projectRepo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findByIdOrShareSlug'>> = {
    findByIdOrShareSlug: jest.fn(),
  };
  const jwtSecretService: jest.Mocked<Pick<JwtSecretService, 'getSecret'>> = {
    getSecret: jest.fn(),
  };

  let service: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtSecretService.getSecret.mockResolvedValue(jwtSecret);
    service = new OAuthService(
      users as unknown as UsersService,
      projectRepo as unknown as ISwaggerProjectRepository,
      jwtSecretService as unknown as JwtSecretService,
    );
  });

  it('validates OAuth clients and optional secrets', async () => {
    projectRepo.findByIdOrShareSlug.mockResolvedValue(server());

    await expect(service.validateClient('server-1', 'client-id', 'client-secret')).resolves.toMatchObject({ _id: 'server-1' });
  });

  it('validates OAuth clients by share slug', async () => {
    projectRepo.findByIdOrShareSlug.mockResolvedValue(server({ shareSlug: 'payments-api' }));

    await expect(service.validateClient('payments-api', 'client-id', 'client-secret')).resolves.toMatchObject({
      _id: 'server-1',
      shareSlug: 'payments-api',
    });
    expect(projectRepo.findByIdOrShareSlug).toHaveBeenCalledWith('payments-api');
  });

  it('rejects missing or invalid OAuth clients', async () => {
    projectRepo.findByIdOrShareSlug.mockResolvedValueOnce(null);
    await expect(service.validateClient('missing', 'client-id')).rejects.toThrow(UnauthorizedException);

    projectRepo.findByIdOrShareSlug.mockResolvedValueOnce(server({ oauthClientId: undefined }));
    await expect(service.validateClient('server-1', 'client-id')).rejects.toThrow(UnauthorizedException);

    projectRepo.findByIdOrShareSlug.mockResolvedValueOnce(server());
    await expect(service.validateClient('server-1', 'bad-client')).rejects.toThrow(UnauthorizedException);

    projectRepo.findByIdOrShareSlug.mockResolvedValueOnce(server());
    await expect(service.validateClient('server-1', 'client-id', 'bad-secret')).rejects.toThrow(UnauthorizedException);
  });

  it('validates users through UsersService', async () => {
    users.findByUsername.mockResolvedValue({ _id: 'user-1', username: 'alex', role: 'admin', password: 'hash' } as any);
    users.validatePassword.mockResolvedValue(true);

    await expect(service.validateUser('alex', 'password')).resolves.toEqual({
      _id: 'user-1',
      username: 'alex',
      role: 'admin',
    });
  });

  it('returns null for unknown users or invalid passwords', async () => {
    users.findByUsername.mockResolvedValueOnce(null);
    await expect(service.validateUser('missing', 'password')).resolves.toBeNull();

    users.findByUsername.mockResolvedValueOnce({ password: 'hash' } as any);
    users.validatePassword.mockResolvedValueOnce(false);
    await expect(service.validateUser('alex', 'wrong')).resolves.toBeNull();
  });

  it('creates and consumes authorization codes once', () => {
    const code = service.createCode('user-1', 'alex', 'admin', 'server-1', 'client-id', 'https://client/callback', 'state');

    expect(service.consumeCode(code, 'server-1', 'client-id', 'https://client/callback')).toMatchObject({
      userId: 'user-1',
      username: 'alex',
      role: 'admin',
      serverId: 'server-1',
      clientId: 'client-id',
      redirectUri: 'https://client/callback',
      state: 'state',
    });
    expect(service.consumeCode(code, 'server-1', 'client-id', 'https://client/callback')).toBeNull();
  });

  it('rejects expired or mismatched authorization codes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const expired = service.createCode('user-1', 'alex', 'admin', 'server-1', 'client-id', 'https://client/callback', 'state');
    jest.setSystemTime(new Date('2026-01-01T00:11:00.000Z'));
    expect(service.consumeCode(expired, 'server-1', 'client-id', 'https://client/callback')).toBeNull();

    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const mismatched = service.createCode('user-1', 'alex', 'admin', 'server-1', 'client-id', 'https://client/callback', 'state');
    expect(service.consumeCode(mismatched, 'server-2', 'client-id', 'https://client/callback')).toBeNull();
    expect(service.consumeCode(mismatched, 'server-1', 'other-client', 'https://client/callback')).toBeNull();
    expect(service.consumeCode(mismatched, 'server-1', 'client-id', 'https://client/other')).toBeNull();
    jest.useRealTimers();
  });

  it('issues and verifies JWT access tokens', async () => {
    const token = await service.issueToken('user-1', 'alex', 'admin', 'server-1');
    const decoded = await service.verifyToken(token);

    expect(decoded).toMatchObject({ sub: 'user-1', username: 'alex', role: 'admin', serverId: 'server-1' });
    expect(jwt.decode(token)).toMatchObject({ sub: 'user-1' });
  });

  it('issues client credentials JWT access tokens', async () => {
    const token = await service.issueClientCredentialsToken('client-id', 'server-1');
    const decoded = await service.verifyToken(token);

    expect(decoded).toMatchObject({ sub: 'client-id', role: 'oauth-client', serverId: 'server-1' });
    expect(jwt.decode(token)).toMatchObject({ clientId: 'client-id' });
  });

  it('returns null for invalid JWT access tokens', async () => {
    await expect(service.verifyToken('not-a-token')).resolves.toBeNull();
  });
});

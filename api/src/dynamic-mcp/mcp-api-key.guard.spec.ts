import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';

const jwtSecret = 'test-jwt-secret-value';

const context = (req: any) => ({
  switchToHttp: () => ({ getRequest: () => req }),
}) as any;

describe('McpApiKeyGuard', () => {
  const repo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findByIdOrShareSlug'>> = {
    findByIdOrShareSlug: jest.fn(),
  };
  const jwtSecretService: jest.Mocked<Pick<JwtSecretService, 'getSecret'>> = {
    getSecret: jest.fn(),
  };

  let guard: McpApiKeyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtSecretService.getSecret.mockResolvedValue(jwtSecret);
    guard = new McpApiKeyGuard(
      repo as unknown as ISwaggerProjectRepository,
      jwtSecretService as unknown as JwtSecretService,
    );
  });

  it('accepts valid OAuth bearer tokens for the requested server', async () => {
    const token = jwt.sign({ serverId: 'server-1' }, jwtSecret);
    repo.findByIdOrShareSlug.mockResolvedValue({ _id: 'server-1', shareSlug: 'payments-api' } as any);

    await expect(guard.canActivate(context({
      headers: { authorization: `Bearer ${token}` },
      params: { serverId: 'payments-api' },
    }))).resolves.toBe(true);
    expect(repo.findByIdOrShareSlug).toHaveBeenCalledWith('payments-api');
  });

  it('rejects bearer tokens for a different server', async () => {
    const token = jwt.sign({ serverId: 'server-2' }, jwtSecret);

    await expect(guard.canActivate(context({
      headers: { authorization: `Bearer ${token}` },
      params: { serverId: 'server-1' },
    }))).rejects.toThrow(UnauthorizedException);
  });

  it('allows missing servers and servers without keys', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context({ headers: {}, params: { serverId: 'missing' } }))).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [], mcpApiKey: null } as any);
    await expect(guard.canActivate(context({ headers: {}, params: { serverId: 'server-1' } }))).resolves.toBe(true);
  });

  it('requires an auth header when keys are configured', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({ mcpApiKeys: [{ key: 'secret' }], mcpApiKey: null } as any);

    await expect(guard.canActivate(context({ headers: {}, params: { serverId: 'server-1' } }))).rejects.toThrow(UnauthorizedException);
  });

  it('accepts matching named and legacy keys and rejects invalid keys', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [{ key: 'named-secret' }], mcpApiKey: null } as any);
    await expect(guard.canActivate(context({ headers: { auth: ' named-secret ' }, params: { serverId: 'payments-api' } }))).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [], mcpApiKey: 'legacy-secret' } as any);
    await expect(guard.canActivate(context({ headers: { auth: 'legacy-secret' }, params: { serverId: 'server-1' } }))).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [{ key: 'named-secret' }], mcpApiKey: null } as any);
    await expect(guard.canActivate(context({ headers: { auth: 'wrong' }, params: { serverId: 'server-1' } }))).rejects.toThrow(UnauthorizedException);
  });
});

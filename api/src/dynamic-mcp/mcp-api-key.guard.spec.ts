import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { ExternalOAuthTokenValidatorService } from '../oauth/external-oauth-token-validator.service';

const jwtSecret = 'test-jwt-secret-value';

const context = (req: any, res: any = {}) => ({
  switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
}) as any;

describe('McpApiKeyGuard', () => {
  const repo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findByIdOrShareSlug'>> = {
    findByIdOrShareSlug: jest.fn(),
  };
  const jwtSecretService: jest.Mocked<Pick<JwtSecretService, 'getSecret'>> = {
    getSecret: jest.fn(),
  };
  const externalValidator: jest.Mocked<Pick<ExternalOAuthTokenValidatorService, 'validate'>> = {
    validate: jest.fn(),
  };

  let guard: McpApiKeyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtSecretService.getSecret.mockResolvedValue(jwtSecret);
    guard = new McpApiKeyGuard(
      repo as unknown as ISwaggerProjectRepository,
      jwtSecretService as unknown as JwtSecretService,
      externalValidator as unknown as ExternalOAuthTokenValidatorService,
    );
  });

  it('accepts valid OAuth bearer tokens for the requested server', async () => {
    const token = jwt.sign({ serverId: 'server-1' }, jwtSecret);
    repo.findByIdOrShareSlug.mockResolvedValue({
      _id: 'server-1', shareSlug: 'payments-api', oauthClientId: 'client-id', oauthConfig: { mode: 'managed' },
    } as any);

    await expect(guard.canActivate(context({
      headers: { authorization: `Bearer ${token}` },
      params: { serverId: 'payments-api' },
    }))).resolves.toBe(true);
    expect(repo.findByIdOrShareSlug).toHaveBeenCalledWith('payments-api');
  });

  it('rejects bearer tokens for a different server', async () => {
    const token = jwt.sign({ serverId: 'server-2' }, jwtSecret);
    repo.findByIdOrShareSlug.mockResolvedValue({
      _id: 'server-1', oauthClientId: 'client-id', oauthConfig: { mode: 'managed' },
    } as any);

    await expect(guard.canActivate(context({
      headers: { authorization: `Bearer ${token}` },
      params: { serverId: 'server-1' },
    }))).rejects.toThrow(UnauthorizedException);
  });

  it('delegates external bearer validation to the configured OAuth provider', async () => {
    const oauthConfig = {
      mode: 'external' as const,
      issuer: 'https://login.example.com',
      authorizationUrl: 'https://login.example.com/authorize',
      tokenUrl: 'https://login.example.com/token',
      jwksUrl: 'https://login.example.com/jwks',
      audience: 'https://mcp.example.com',
      scopes: ['orders.read'],
    };
    repo.findByIdOrShareSlug.mockResolvedValue({ _id: 'server-1', oauthConfig } as any);
    externalValidator.validate.mockResolvedValue({ sub: 'user-1' });

    await expect(guard.canActivate(context({
      headers: { authorization: 'Bearer external-token' },
      params: { serverId: 'server-1' },
    }))).resolves.toBe(true);
    expect(externalValidator.validate).toHaveBeenCalledWith('external-token', oauthConfig);
  });

  it('requires a bearer token when OAuth is enabled and no API key exists', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({
      _id: 'server-1', mcpApiKeys: [], mcpApiKey: null, oauthConfig: { mode: 'managed' }, oauthClientId: 'client-id',
    } as any);
    const setHeader = jest.fn();

    await expect(guard.canActivate(context({
      protocol: 'https', get: () => 'mcp.example.com', headers: {}, params: { serverId: 'server-1' },
    }, { setHeader }))).rejects.toThrow('Missing OAuth bearer token');
    expect(setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/api/mcp/server/server-1"',
    );
  });

  it('publishes the OAuth challenge when OAuth and Access Keys are both enabled', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({
      _id: 'server-1',
      mcpApiKeys: [{ key: 'access-key' }],
      oauthConfig: { mode: 'external' },
    } as any);
    const setHeader = jest.fn();

    await expect(guard.canActivate(context({
      protocol: 'https', get: () => 'mcp.example.com', headers: {}, params: { serverId: 'server-1' },
    }, { setHeader }))).rejects.toThrow('Missing credentials');
    expect(setHeader).toHaveBeenCalled();
  });

  it('allows missing servers and servers without keys', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context({ headers: {}, params: { serverId: 'missing' } }))).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [], mcpApiKey: null } as any);
    await expect(guard.canActivate(context({ headers: {}, params: { serverId: 'server-1' } }))).resolves.toBe(true);
  });

  it('requires an access key when keys are configured', async () => {
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

  it('accepts matching named and legacy keys from the auth query parameter', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [{ key: 'named-secret' }], mcpApiKey: null } as any);
    await expect(guard.canActivate(context({
      headers: {},
      query: { auth: ' named-secret ' },
      params: { serverId: 'payments-api' },
    }))).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ mcpApiKeys: [], mcpApiKey: 'legacy-secret' } as any);
    await expect(guard.canActivate(context({
      headers: {},
      query: { auth: 'legacy-secret' },
      params: { serverId: 'server-1' },
    }))).resolves.toBe(true);
  });
});

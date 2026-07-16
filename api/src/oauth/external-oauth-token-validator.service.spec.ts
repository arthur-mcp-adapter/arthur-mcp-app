import { generateKeyPairSync } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { ExternalOAuthTokenValidatorService } from './external-oauth-token-validator.service';

jest.mock('axios');

describe('ExternalOAuthTokenValidatorService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const issuer = 'https://login.example.com';
  const audience = 'https://mcp.example.com/mcp/server/orders';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1', use: 'sig', alg: 'RS256' };
  let service: ExternalOAuthTokenValidatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExternalOAuthTokenValidatorService();
  });

  it('validates external JWTs with issuer, audience, expiry, and required scopes', async () => {
    mockedAxios.get.mockResolvedValue({ data: { keys: [publicJwk] } } as any);
    const token = jwt.sign({ scope: 'orders.read profile' }, privateKey, {
      algorithm: 'RS256', keyid: 'key-1', issuer, audience, expiresIn: '5m',
    });

    await expect(service.validate(token, {
      mode: 'external',
      issuer,
      authorizationUrl: `${issuer}/authorize`,
      tokenUrl: `${issuer}/token`,
      jwksUrl: `${issuer}/jwks`,
      audience,
      scopes: ['orders.read'],
    })).resolves.toMatchObject({ iss: issuer, aud: audience });
  });

  it('rejects JWTs issued for another MCP audience', async () => {
    mockedAxios.get.mockResolvedValue({ data: { keys: [publicJwk] } } as any);
    const token = jwt.sign({ scope: 'orders.read' }, privateKey, {
      algorithm: 'RS256', keyid: 'key-1', issuer, audience: 'https://other.example.com', expiresIn: '5m',
    });

    await expect(service.validate(token, {
      mode: 'external',
      issuer,
      authorizationUrl: `${issuer}/authorize`,
      tokenUrl: `${issuer}/token`,
      jwksUrl: `${issuer}/jwks`,
      audience,
      scopes: ['orders.read'],
    })).rejects.toThrow(UnauthorizedException);
  });

  it('supports opaque tokens through RFC 7662 introspection', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { active: true, iss: issuer, aud: audience, scope: 'orders.read', exp: Math.floor(Date.now() / 1000) + 300 },
    } as any);

    await expect(service.validate('opaque-token', {
      mode: 'external',
      issuer,
      authorizationUrl: `${issuer}/authorize`,
      tokenUrl: `${issuer}/token`,
      introspectionUrl: `${issuer}/introspect`,
      introspectionClientId: 'arthur-mcp',
      introspectionClientSecret: 'secret',
      audience,
      scopes: ['orders.read'],
    })).resolves.toMatchObject({ active: true });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${issuer}/introspect`,
      'token=opaque-token',
      expect.objectContaining({ auth: { username: 'arthur-mcp', password: 'secret' } }),
    );
  });
});

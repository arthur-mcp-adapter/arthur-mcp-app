import { NotFoundException } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

describe('OAuthController metadata', () => {
  const oauthService = {
    findServer: jest.fn(),
    resolveConfig: jest.fn(),
  };
  const request = { protocol: 'https', headers: {}, get: () => 'arthur.example.com' } as any;
  let controller: OAuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OAuthController(oauthService as unknown as OAuthService);
  });

  it('publishes external authorization server metadata for an MCP resource', async () => {
    oauthService.findServer.mockResolvedValue({ _id: 'server-1', shareSlug: 'orders' });
    oauthService.resolveConfig.mockReturnValue({
      mode: 'external',
      issuer: 'https://login.customer.com',
      authorizationUrl: 'https://login.customer.com/authorize',
      tokenUrl: 'https://login.customer.com/token',
      jwksUrl: 'https://login.customer.com/jwks',
      audience: 'https://arthur.example.com/api/mcp/server/orders',
      scopes: ['orders.read'],
    });

    await expect(controller.protectedResourceMetadata('orders', request)).resolves.toEqual({
      resource: 'https://arthur.example.com/api/mcp/server/orders',
      authorization_servers: ['https://login.customer.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['orders.read'],
      resource_documentation: 'https://arthur.example.com/mcp-swagger/orders',
    });
  });

  it('publishes server-specific Arthur metadata only for managed OAuth', async () => {
    oauthService.findServer.mockResolvedValue({ _id: 'server-1', shareSlug: 'orders' });
    oauthService.resolveConfig.mockReturnValue({ mode: 'managed' });

    await expect(controller.managedAuthorizationServerMetadata('orders', request)).resolves.toEqual({
      issuer: 'https://arthur.example.com/oauth/server/orders',
      authorization_endpoint: 'https://arthur.example.com/oauth/server/orders/authorize',
      token_endpoint: 'https://arthur.example.com/oauth/server/orders/token',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'client_credentials'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
    });

    oauthService.resolveConfig.mockReturnValue({ mode: 'external' });
    await expect(controller.managedAuthorizationServerMetadata('orders', request)).rejects.toThrow(NotFoundException);
  });
});

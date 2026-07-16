import * as jwt from 'jsonwebtoken';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { ExternalOAuthTokenValidatorService } from '../oauth/external-oauth-token-validator.service';

@Injectable()
export class McpApiKeyGuard implements CanActivate {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    private readonly jwtSecretService: JwtSecretService,
    private readonly externalOAuthTokenValidator: ExternalOAuthTokenValidatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse();
    const serverId = req.params['serverId'];
    const server = serverId ? await this.projectRepo.findByIdOrShareSlug(serverId) : null;
    const oauthConfig = server?.oauthConfig?.mode && server.oauthConfig.mode !== 'none'
      ? server.oauthConfig
      : server?.oauthClientId
        ? { mode: 'managed' as const }
        : { mode: 'none' as const };

    const setOAuthChallenge = () => {
      if (!serverId || !res?.setHeader) return;
      const forwardedProto = req.headers['x-forwarded-proto'];
      const forwardedHost = req.headers['x-forwarded-host'];
      const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)?.split(',')[0]?.trim()
        || (typeof req.get === 'function' ? req.get('host') : req.headers.host);
      if (!host) return;
      const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0]?.trim()
        || req.protocol
        || 'http';
      const base = `${protocol}://${host}`;
      const metadata = `${base}/.well-known/oauth-protected-resource/api/mcp/server/${encodeURIComponent(serverId)}`;
      res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${metadata}"`);
    };

    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        if (oauthConfig.mode === 'external') {
          await this.externalOAuthTokenValidator.validate(token, oauthConfig);
        } else if (oauthConfig.mode === 'managed') {
          const payload = jwt.verify(token, await this.jwtSecretService.getSecret()) as { serverId?: string };
          const allowedServerIds = new Set([serverId, server?._id, server?.shareSlug].filter(Boolean));
          if (payload.serverId && serverId && !allowedServerIds.has(payload.serverId)) {
            throw new UnauthorizedException('Token not valid for this server');
          }
        } else {
          throw new UnauthorizedException('OAuth is not enabled for this server');
        }
        return true;
      } catch (err: any) {
        setOAuthChallenge();
        throw new UnauthorizedException(err?.message ?? 'Invalid or expired OAuth token');
      }
    }
    if (!server) return true;

    const hasNewKeys = server.mcpApiKeys && server.mcpApiKeys.length > 0;
    const hasLegacyKey = !!server.mcpApiKey;

    if (!hasNewKeys && !hasLegacyKey) {
      if (oauthConfig.mode !== 'none') {
        setOAuthChallenge();
        throw new UnauthorizedException('Missing OAuth bearer token.');
      }
      return true;
    }

    const headerKey =
      typeof req.headers['auth'] === 'string' ? req.headers['auth'].trim() : null;
    const queryKey =
      typeof req.query?.['auth'] === 'string' ? req.query['auth'].trim() : null;
    const provided = headerKey || queryKey;

    if (!provided) {
      if (oauthConfig.mode !== 'none') {
        setOAuthChallenge();
        throw new UnauthorizedException('Missing credentials. Provide an OAuth bearer token or a valid MCP Access Key.');
      }
      throw new UnauthorizedException('Missing API key. Provide the auth header or the auth query parameter.');
    }

    if (hasNewKeys) {
      const match = server.mcpApiKeys.some((k) => k.key === provided);
      if (!match) throw new UnauthorizedException('Invalid API key.');
      return true;
    }

    if (provided !== server.mcpApiKey) throw new UnauthorizedException('Invalid API key.');
    return true;
  }
}

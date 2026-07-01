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

@Injectable()
export class McpApiKeyGuard implements CanActivate {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    private readonly jwtSecretService: JwtSecretService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Accept OAuth Bearer tokens as a valid auth method
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, await this.jwtSecretService.getSecret()) as { serverId?: string };
        const serverId = req.params['serverId'];
        const server = serverId ? await this.projectRepo.findByIdOrShareSlug(serverId) : null;
        const allowedServerIds = new Set([serverId, server?._id, server?.shareSlug].filter(Boolean));
        if (payload.serverId && serverId && !allowedServerIds.has(payload.serverId)) {
          throw new UnauthorizedException('Token not valid for this server');
        }
        return true;
      } catch (err: any) {
        throw new UnauthorizedException(err?.message ?? 'Invalid or expired OAuth token');
      }
    }

    const serverId = req.params['serverId'];

    const server = await this.projectRepo.findByIdOrShareSlug(serverId);
    if (!server) return true;

    const hasNewKeys = server.mcpApiKeys && server.mcpApiKeys.length > 0;
    const hasLegacyKey = !!server.mcpApiKey;

    if (!hasNewKeys && !hasLegacyKey) return true;

    const provided =
      typeof req.headers['auth'] === 'string' ? req.headers['auth'].trim() : null;

    if (!provided) {
      throw new UnauthorizedException('Missing API key. Provide the header: auth: <key>');
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

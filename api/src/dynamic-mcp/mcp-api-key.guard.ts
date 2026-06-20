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
import { config } from '../config/configuration';

@Injectable()
export class McpApiKeyGuard implements CanActivate {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Accept OAuth Bearer tokens as a valid auth method
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, config.jwtSecret) as { projectId?: string };
        const projectId = req.params['projectId'];
        if (payload.projectId && projectId && payload.projectId !== projectId) {
          throw new UnauthorizedException('Token not valid for this project');
        }
        return true;
      } catch (err: any) {
        throw new UnauthorizedException(err?.message ?? 'Invalid or expired OAuth token');
      }
    }

    const projectId = req.params['projectId'];

    const project = await this.projectRepo.findById(projectId);
    if (!project) return true;

    const hasNewKeys = project.mcpApiKeys && project.mcpApiKeys.length > 0;
    const hasLegacyKey = !!project.mcpApiKey;

    if (!hasNewKeys && !hasLegacyKey) return true;

    const provided =
      typeof req.headers['auth'] === 'string' ? req.headers['auth'].trim() : null;

    if (!provided) {
      throw new UnauthorizedException('Missing API key. Provide the header: auth: <key>');
    }

    if (hasNewKeys) {
      const match = project.mcpApiKeys.some((k) => k.key === provided);
      if (!match) throw new UnauthorizedException('Invalid API key.');
      return true;
    }

    if (provided !== project.mcpApiKey) throw new UnauthorizedException('Invalid API key.');
    return true;
  }
}

import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PROJECT_REPO } from '../../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger-project.repository';

@Injectable()
export class ServerOwnershipGuard implements CanActivate {
  constructor(@Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.params.id) return true; // routes with no :id (list/create) are scoped elsewhere

    const server = await this.projectRepo.findById(req.params.id);
    if (!server || server.ownerId !== req.user.userId) {
      // 404, not 403 — don't let callers distinguish "not yours" from "doesn't exist"
      throw new NotFoundException('Project not found.');
    }
    return true;
  }
}

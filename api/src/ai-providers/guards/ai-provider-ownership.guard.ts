import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AI_PROVIDER_REPO } from '../../database/database.tokens';
import { IAiProviderRepository } from '../ai-provider.repository';

@Injectable()
export class AiProviderOwnershipGuard implements CanActivate {
  constructor(@Inject(AI_PROVIDER_REPO) private readonly aiProviderRepo: IAiProviderRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.params.id) return true; // routes with no :id (list/create/generate-tools/test-config) are scoped elsewhere

    const provider = await this.aiProviderRepo.findById(req.params.id);
    if (!provider || provider.ownerId !== req.user.userId) {
      throw new NotFoundException('AI provider not found.');
    }
    return true;
  }
}

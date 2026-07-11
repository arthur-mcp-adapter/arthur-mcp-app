import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PROMPT_REPO } from '../../database/database.tokens';
import { IPromptRepository } from '../prompt.repository';

@Injectable()
export class PromptOwnershipGuard implements CanActivate {
  constructor(@Inject(PROMPT_REPO) private readonly promptRepo: IPromptRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.params.id) return true; // routes with no :id (list/create) are scoped elsewhere

    const prompt = await this.promptRepo.findById(req.params.id);
    if (!prompt || prompt.ownerId !== req.user.userId) {
      throw new NotFoundException('Prompt not found.');
    }
    return true;
  }
}

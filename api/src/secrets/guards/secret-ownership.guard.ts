import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SECRET_REPO } from '../../database/database.tokens';
import { ISecretRepository } from '../secret.repository';

@Injectable()
export class SecretOwnershipGuard implements CanActivate {
  constructor(@Inject(SECRET_REPO) private readonly secretRepo: ISecretRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.params.id) return true; // routes with no :id (list/create) are scoped elsewhere

    const secret = await this.secretRepo.findById(req.params.id);
    if (!secret || secret.ownerId !== req.user.userId) {
      throw new NotFoundException('Secret not found.');
    }
    return true;
  }
}

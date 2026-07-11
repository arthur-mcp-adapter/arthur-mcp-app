import { Module } from '@nestjs/common';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';
import { SecretOwnershipGuard } from './guards/secret-ownership.guard';

@Module({
  controllers: [SecretsController],
  providers: [SecretsService, SecretOwnershipGuard],
  exports: [SecretsService],
})
export class SecretsModule {}

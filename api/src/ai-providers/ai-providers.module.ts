import { Module } from '@nestjs/common';
import { AiProvidersController } from './ai-providers.controller';
import { AiProvidersService } from './ai-providers.service';
import { AiProviderExecutorService } from './ai-provider-executor.service';
import { ErrorTrackingModule } from '../error-tracking/error-tracking.module';
import { AiProviderOwnershipGuard } from './guards/ai-provider-ownership.guard';

@Module({
  imports: [ErrorTrackingModule],
  controllers: [AiProvidersController],
  providers: [AiProvidersService, AiProviderExecutorService, AiProviderOwnershipGuard],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}

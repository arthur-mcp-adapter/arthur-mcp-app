import { Module } from '@nestjs/common';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';
import { PromptOwnershipGuard } from './guards/prompt-ownership.guard';

@Module({
  controllers: [PromptsController],
  providers: [PromptsService, PromptOwnershipGuard],
  exports: [PromptsService],
})
export class PromptsModule {}

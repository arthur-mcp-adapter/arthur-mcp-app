import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PromptsService } from './prompts.service';
import { PromptOwnershipGuard } from './guards/prompt-ownership.guard';

@Controller('prompts')
@UseGuards(JwtAuthGuard, PromptOwnershipGuard)
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.promptsService.findAll(req.user.userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.promptsService.findById(id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: { name: string; description?: string; content: string; tags?: string[] }) {
    return this.promptsService.create(dto, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<{ name: string; description?: string; content: string; tags: string[] }>,
  ) {
    return this.promptsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string) {
    return this.promptsService.delete(id);
  }
}

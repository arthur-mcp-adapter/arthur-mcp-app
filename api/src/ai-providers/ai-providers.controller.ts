import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';

@Controller('ai-providers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiProvidersController {
  constructor(private readonly service: AiProvidersService) {}

  @Get()
  @RequirePermission('ai_providers_view')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('ai_providers_create')
  create(@Body() dto: CreateAiProviderDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequirePermission('ai_providers_view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('ai_providers_edit')
  update(@Param('id') id: string, @Body() dto: UpdateAiProviderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('ai_providers_delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { GenerateToolsDto } from './dto/generate-tools.dto';

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

  @Post('generate-tools')
  @RequirePermission('ai_providers_execute')
  generateTools(@Body() dto: GenerateToolsDto) {
    return this.service.generateTools(dto);
  }

  @Post('test-config')
  @RequirePermission('ai_providers_execute')
  testConfig(@Body() dto: CreateAiProviderDto) {
    return this.service.testConfig(dto);
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

  @Post(':id/default')
  @RequirePermission('ai_providers_edit')
  setDefault(@Param('id') id: string) {
    return this.service.setDefault(id);
  }

  @Post(':id/test')
  @RequirePermission('ai_providers_execute')
  test(@Param('id') id: string) {
    return this.service.test(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('ai_providers_delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

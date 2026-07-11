import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';
import { GenerateToolsDto } from './dto/generate-tools.dto';
import { AiProviderOwnershipGuard } from './guards/ai-provider-ownership.guard';

@Controller('ai-providers')
@UseGuards(JwtAuthGuard, PermissionsGuard, AiProviderOwnershipGuard)
export class AiProvidersController {
  constructor(private readonly service: AiProvidersService) {}

  @Get()
  @RequirePermission('ai_providers_view')
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.userId);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('ai_providers_create')
  create(@Request() req: any, @Body() dto: CreateAiProviderDto) {
    return this.service.create(dto, req.user.userId);
  }

  @Post('generate-tools')
  @RequirePermission('ai_providers_execute')
  generateTools(@Request() req: any, @Body() dto: GenerateToolsDto) {
    return this.service.generateTools(dto, req.user.userId);
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
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAiProviderDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Post(':id/default')
  @RequirePermission('ai_providers_edit')
  setDefault(@Request() req: any, @Param('id') id: string) {
    return this.service.setDefault(id, req.user.userId);
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

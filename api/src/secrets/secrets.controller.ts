import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SecretsService } from './secrets.service';

@Controller('secrets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Get()
  @RequirePermission('secrets_view_names')
  findAll() {
    return this.secretsService.findAll();
  }

  @Get(':id')
  @RequirePermission('secrets_view_names')
  findById(@Param('id') id: string) {
    return this.secretsService.findById(id);
  }

  @Get(':id/value')
  @RequirePermission('secrets_reveal_values')
  revealValue(@Param('id') id: string) {
    return this.secretsService.revealValue(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('secrets_create')
  create(@Body() dto: { name: string; value: string; description?: string }) {
    return this.secretsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('secrets_edit')
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; value?: string; description?: string },
  ) {
    return this.secretsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('secrets_delete')
  delete(@Param('id') id: string) {
    return this.secretsService.delete(id);
  }
}

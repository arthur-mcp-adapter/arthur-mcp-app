import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ErrorTrackingService } from './error-tracking.service'
import { CreateErrorTrackingProviderDto } from './dto/create-error-tracking-provider.dto'
import { UpdateErrorTrackingProviderDto } from './dto/update-error-tracking-provider.dto'

@Controller('error-tracking-providers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ErrorTrackingController {
  constructor(private readonly errorTrackingService: ErrorTrackingService) {}

  @Get()
  @RequirePermission('error_tracking_view')
  findAll() {
    return this.errorTrackingService.findAll()
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('error_tracking_create')
  create(@Body() dto: CreateErrorTrackingProviderDto) {
    return this.errorTrackingService.create(dto)
  }

  @Get(':id')
  @RequirePermission('error_tracking_view')
  findById(@Param('id') id: string) {
    return this.errorTrackingService.findById(id)
  }

  @Patch(':id')
  @RequirePermission('error_tracking_edit')
  update(@Param('id') id: string, @Body() dto: UpdateErrorTrackingProviderDto) {
    return this.errorTrackingService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('error_tracking_delete')
  delete(@Param('id') id: string) {
    return this.errorTrackingService.delete(id)
  }

  @Post(':id/reveal-dsn')
  @RequirePermission('error_tracking_edit')
  revealDsn(@Param('id') id: string) {
    return this.errorTrackingService.revealDsn(id)
  }

  @Post(':id/test')
  @RequirePermission('error_tracking_edit')
  testConnection(@Param('id') id: string) {
    return this.errorTrackingService.testConnection(id)
  }
}

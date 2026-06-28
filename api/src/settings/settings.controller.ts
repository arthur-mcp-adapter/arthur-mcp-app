import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get()
  get() {
    return this.settings.getSafe();
  }

  @Patch()
  @RequirePermission('settings_manage')
  async update(@Request() req: any, @Body() dto: any) {
    const updated = await this.settings.update(dto);
    this.auditLogs.log({
      userId: req.user.userId,
      username: req.user.username,
      action: 'update',
      entity: 'settings',
      entityName: 'System settings',
      ip: req.ip,
    });
    return updated;
  }
}

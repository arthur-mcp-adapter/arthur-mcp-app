import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SettingsService, SettingsSnapshot } from './settings.service';

/** Read-only — configuration is environment-variable-only, see docs/DATA_SOURCE_INTEGRATION_PLAN.pt-BR.md context. */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(): SettingsSnapshot {
    return this.settings.getSnapshot();
  }
}

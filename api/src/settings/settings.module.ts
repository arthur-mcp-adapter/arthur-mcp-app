import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { JwtSecretService } from './jwt-secret.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [SettingsController],
  providers: [SettingsService, JwtSecretService],
  exports: [SettingsService, JwtSecretService],
})
export class SettingsModule {}

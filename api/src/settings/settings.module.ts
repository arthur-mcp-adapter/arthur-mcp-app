import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { JwtSecretService } from './jwt-secret.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, JwtSecretService],
  exports: [SettingsService, JwtSecretService],
})
export class SettingsModule {}

import { Injectable } from '@nestjs/common';
import { config } from '../config/configuration';
import { SettingsService } from './settings.service';

@Injectable()
export class JwtSecretService {
  constructor(private readonly settingsService: SettingsService) {}

  async getSecret(): Promise<string> {
    const settings = await this.settingsService.get();
    return settings.jwtSecret || config.jwtSecret;
  }
}

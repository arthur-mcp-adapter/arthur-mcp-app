import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SETTINGS_REPO } from '../database/database.tokens';
import { ISettingsRepository, SettingsRecord } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(@Inject(SETTINGS_REPO) private readonly settingsRepo: ISettingsRepository) {}

  async get(): Promise<SettingsRecord> {
    return this.settingsRepo.getGlobal();
  }

  async update(dto: Partial<Omit<SettingsRecord, '_id' | 'key'>>): Promise<SettingsRecord> {
    if (dto.jwtSecret !== undefined) {
      const jwtSecret = dto.jwtSecret.trim();
      if (jwtSecret && jwtSecret.length < 16) {
        throw new BadRequestException('JWT secret must be at least 16 characters.');
      }
      dto.jwtSecret = jwtSecret;
    }
    return this.settingsRepo.updateGlobal(dto);
  }

  async getSafe(): Promise<Omit<SettingsRecord, 'smtpPass' | 'jwtSecret'> & { smtpPassSet: boolean; jwtSecretSet: boolean }> {
    const doc = await this.get();
    const { smtpPass, jwtSecret, ...rest } = doc;
    return { ...rest, smtpPassSet: !!smtpPass, jwtSecretSet: !!jwtSecret };
  }
}

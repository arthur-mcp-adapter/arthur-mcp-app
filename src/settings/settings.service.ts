import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_REPO } from '../database/database.tokens';
import { ISettingsRepository, SettingsRecord } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(@Inject(SETTINGS_REPO) private readonly settingsRepo: ISettingsRepository) {}

  async get(): Promise<SettingsRecord> {
    return this.settingsRepo.getGlobal();
  }

  async update(dto: Partial<Omit<SettingsRecord, '_id' | 'key'>>): Promise<SettingsRecord> {
    return this.settingsRepo.updateGlobal(dto);
  }

  async getSafe(): Promise<Omit<SettingsRecord, 'smtpPass'> & { smtpPassSet: boolean }> {
    const doc = await this.get();
    const { smtpPass, ...rest } = doc;
    return { ...rest, smtpPassSet: !!smtpPass };
  }
}

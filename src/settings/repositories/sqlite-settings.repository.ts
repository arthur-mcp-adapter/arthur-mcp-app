import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from '../settings.entity';
import { ISettingsRepository, SettingsRecord } from '../settings.repository';

@Injectable()
export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(@InjectRepository(SettingsEntity) private readonly repo: Repository<SettingsEntity>) {}

  private toRecord(e: SettingsEntity): SettingsRecord {
    return {
      _id: e.id,
      key: e.key,
      serverBaseUrl: e.serverBaseUrl ?? '',
      defaultTimeoutMs: e.defaultTimeoutMs ?? 30000,
      smtpHost: e.smtpHost ?? '',
      smtpPort: e.smtpPort ?? 587,
      smtpUser: e.smtpUser ?? '',
      smtpPass: e.smtpPass ?? '',
      smtpFrom: e.smtpFrom ?? '',
    };
  }

  async getGlobal(): Promise<SettingsRecord> {
    let e = await this.repo.findOne({ where: { key: 'global' } });
    if (!e) e = await this.repo.save(this.repo.create({ key: 'global' }));
    return this.toRecord(e);
  }

  async updateGlobal(data: Partial<Omit<SettingsRecord, '_id' | 'key'>>): Promise<SettingsRecord> {
    let e = await this.repo.findOne({ where: { key: 'global' } });
    if (!e) e = this.repo.create({ key: 'global' });
    Object.assign(e, data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }
}

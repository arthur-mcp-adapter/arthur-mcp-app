import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from '../settings.schema';
import { ISettingsRepository, SettingsRecord } from '../settings.repository';

@Injectable()
export class MongoSettingsRepository implements ISettingsRepository {
  constructor(@InjectModel(Settings.name) private readonly model: Model<SettingsDocument>) {}

  private toRecord(doc: SettingsDocument | Record<string, any>): SettingsRecord {
    const obj = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;
    return {
      _id: String(obj._id),
      key: obj.key,
      serverBaseUrl: obj.serverBaseUrl ?? '',
      defaultTimeoutMs: obj.defaultTimeoutMs ?? 30000,
      smtpHost: obj.smtpHost ?? '',
      smtpPort: obj.smtpPort ?? 587,
      smtpUser: obj.smtpUser ?? '',
      smtpPass: obj.smtpPass ?? '',
      smtpFrom: obj.smtpFrom ?? '',
    };
  }

  async getGlobal(): Promise<SettingsRecord> {
    let doc = await this.model.findOne({ key: 'global' }).exec();
    if (!doc) doc = await this.model.create({ key: 'global' });
    return this.toRecord(doc);
  }

  async updateGlobal(data: Partial<Omit<SettingsRecord, '_id' | 'key'>>): Promise<SettingsRecord> {
    const doc = await this.model
      .findOneAndUpdate({ key: 'global' }, { $set: data }, { new: true, upsert: true })
      .exec();
    return this.toRecord(doc!);
  }
}

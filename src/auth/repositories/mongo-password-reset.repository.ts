import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordReset, PasswordResetDocument } from '../password-reset.schema';
import { IPasswordResetRepository, PasswordResetRecord } from '../password-reset.repository';

@Injectable()
export class MongoPasswordResetRepository implements IPasswordResetRepository {
  constructor(
    @InjectModel(PasswordReset.name) private readonly model: Model<PasswordResetDocument>,
  ) {}

  private toRecord(doc: PasswordResetDocument): PasswordResetRecord {
    const obj = doc.toObject();
    return {
      _id: String(obj._id),
      userId: obj.userId,
      token: obj.token,
      expiresAt: obj.expiresAt,
      used: obj.used,
    };
  }

  async create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetRecord> {
    const doc = await this.model.create(data);
    return this.toRecord(doc);
  }

  async findByToken(token: string): Promise<PasswordResetRecord | null> {
    const doc = await this.model.findOne({ token, used: false }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.model.deleteMany({ userId }).exec();
  }

  async markUsed(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { used: true }).exec();
  }
}

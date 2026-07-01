import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorTrackingProvider, ErrorTrackingProviderDocument } from '../error-tracking-provider.schema';
import { IErrorTrackingProviderRepository, ErrorTrackingProviderRecord } from '../error-tracking-provider.repository';

@Injectable()
export class MongoErrorTrackingProviderRepository implements IErrorTrackingProviderRepository {
  constructor(
    @InjectModel(ErrorTrackingProvider.name)
    private readonly model: Model<ErrorTrackingProviderDocument>,
  ) {}

  private toRecord(doc: ErrorTrackingProviderDocument | Record<string, any>): ErrorTrackingProviderRecord {
    const obj = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;
    return {
      id: String(obj._id),
      name: obj.name,
      description: obj.description,
      tool: obj.tool,
      dsn: obj.dsn,
      projectName: obj.projectName,
      environment: obj.environment,
      isActive: obj.isActive,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async findAll(): Promise<ErrorTrackingProviderRecord[]> {
    const docs = await this.model.find().sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toRecord(d as any));
  }

  async findById(id: string): Promise<ErrorTrackingProviderRecord | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toRecord(doc) : null;
    } catch { return null; }
  }

  async findActive(): Promise<ErrorTrackingProviderRecord | null> {
    const doc = await this.model.findOne({ isActive: true }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async create(data: Omit<ErrorTrackingProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ErrorTrackingProviderRecord> {
    const doc = await this.model.create(data);
    return this.toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<ErrorTrackingProviderRecord, 'id'>>): Promise<ErrorTrackingProviderRecord | null> {
    try {
      const doc = await this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
      return doc ? this.toRecord(doc) : null;
    } catch { return null; }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      return !!result;
    } catch { return false; }
  }

  async deactivateAll(): Promise<void> {
    await this.model.updateMany({}, { $set: { isActive: false } }).exec();
  }
}

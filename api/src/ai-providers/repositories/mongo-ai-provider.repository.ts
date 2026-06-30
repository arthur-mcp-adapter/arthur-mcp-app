import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiProvider, AiProviderDocument } from '../ai-provider.schema';
import { AiProviderRecord, IAiProviderRepository } from '../ai-provider.repository';

@Injectable()
export class MongoAiProviderRepository implements IAiProviderRepository {
  constructor(@InjectModel(AiProvider.name) private readonly model: Model<AiProviderDocument>) {}

  private toRecord(doc: AiProviderDocument | Record<string, any>): AiProviderRecord {
    const obj = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;
    return {
      id: String(obj._id),
      name: obj.name,
      description: obj.description,
      provider: obj.provider,
      model: obj.model,
      apiKey: obj.apiKey,
      baseUrl: obj.baseUrl,
      isActive: obj.isActive ?? true,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async findAll(): Promise<AiProviderRecord[]> {
    const docs = await this.model.find().sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toRecord(d));
  }

  async findById(id: string): Promise<AiProviderRecord | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async create(data: Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiProviderRecord> {
    const doc = await this.model.create(data);
    return this.toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AiProviderRecord | null> {
    const doc = await this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }
}

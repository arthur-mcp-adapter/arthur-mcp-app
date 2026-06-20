import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SwaggerProject, SwaggerProjectDocument } from '../swagger-project.schema';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from '../swagger-project.repository';

@Injectable()
export class MongoSwaggerProjectRepository implements ISwaggerProjectRepository {
  constructor(
    @InjectModel(SwaggerProject.name) private readonly model: Model<SwaggerProjectDocument>,
  ) {}

  private toRecord(doc: SwaggerProjectDocument | Record<string, any>, includeRawSpec = true): SwaggerProjectRecord {
    const obj = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;
    return {
      _id: String(obj._id),
      name: obj.name,
      baseUrl: obj.baseUrl,
      description: obj.description,
      version: obj.version,
      rawSpec: includeRawSpec ? obj.rawSpec : undefined,
      tools: obj.tools ?? [],
      auth: obj.auth ?? { type: 'none' },
      status: obj.status ?? 'active',
      errorMessage: obj.errorMessage,
      mcpApiKey: obj.mcpApiKey,
      mcpApiKeys: obj.mcpApiKeys ?? [],
      oauthClientId: obj.oauthClientId,
      oauthClientSecret: obj.oauthClientSecret,
      tags: obj.tags ?? [],
      rateLimit: obj.rateLimit ?? { enabled: false, requestsPerMinute: 60 },
      isPaused: obj.isPaused ?? false,
      maintenanceMode: obj.maintenanceMode ?? { enabled: false, message: '' },
      availabilityWindow: obj.availabilityWindow ?? { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: obj.alertConfig ?? { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async findById(id: string): Promise<SwaggerProjectRecord | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toRecord(doc, true) : null;
    } catch {
      return null;
    }
  }

  async findAll(filter?: { tags?: string[] }): Promise<SwaggerProjectRecord[]> {
    const query: Record<string, any> = {};
    if (filter?.tags?.length) query.tags = { $all: filter.tags };
    const docs = await this.model
      .find(query)
      .select('-rawSpec -mcpApiKey')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toRecord(d as any, false));
  }

  async findAllIds(): Promise<string[]> {
    const docs = await this.model.find().select('_id').lean().exec();
    return docs.map((d) => String((d as any)._id));
  }

  async create(data: Omit<SwaggerProjectRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<SwaggerProjectRecord> {
    const doc = await this.model.create(data);
    return this.toRecord(doc, true);
  }

  async update(id: string, data: Partial<Omit<SwaggerProjectRecord, '_id'>>): Promise<SwaggerProjectRecord | null> {
    try {
      const doc = await this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
      return doc ? this.toRecord(doc, true) : null;
    } catch {
      return null;
    }
  }

  async save(record: SwaggerProjectRecord): Promise<SwaggerProjectRecord> {
    const { _id, ...data } = record;
    const doc = await this.model.findByIdAndUpdate(_id, { $set: data }, { new: true }).exec();
    if (!doc) throw new NotFoundException('Project not found.');
    return this.toRecord(doc, true);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      return !!result;
    } catch {
      return false;
    }
  }
}

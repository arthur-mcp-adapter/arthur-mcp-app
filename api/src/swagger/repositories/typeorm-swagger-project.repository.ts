import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwaggerProjectEntity } from '../swagger-project.entity';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from '../swagger-project.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TypeOrmSwaggerProjectRepository implements ISwaggerProjectRepository {
  constructor(
    @InjectRepository(SwaggerProjectEntity) private readonly repo: Repository<SwaggerProjectEntity>,
  ) {}

  private toRecord(e: SwaggerProjectEntity, includeRawSpec = true): SwaggerProjectRecord {
    return {
      _id: e.id,
      name: e.name,
      baseUrl: e.baseUrl,
      description: e.description,
      version: e.version,
      shareSlug: (e as any).shareSlug,
      rawSpec: includeRawSpec && e.rawSpec ? JSON.parse(e.rawSpec) : undefined,
      tools: e.tools ? JSON.parse(e.tools) : [],
      auth: e.auth ? JSON.parse(e.auth) : { type: 'none' },
      status: e.status ?? 'active',
      errorMessage: e.errorMessage,
      mcpApiKey: e.mcpApiKey,
      mcpApiKeys: e.mcpApiKeys ? JSON.parse(e.mcpApiKeys) : [],
      resources: e.resources ? JSON.parse(e.resources) : [],
      prompts: e.prompts ? JSON.parse(e.prompts) : [],
      chains: e.chains ? JSON.parse(e.chains) : [],
      oauthClientId: e.oauthClientId,
      oauthClientSecret: e.oauthClientSecret,
      oauthConfig: e.oauthConfig
        ? JSON.parse(e.oauthConfig)
        : (e.oauthClientId ? { mode: 'managed' } : { mode: 'none' }),
      tags: e.tags ? JSON.parse(e.tags) : [],
      rateLimit: e.rateLimit ? JSON.parse(e.rateLimit) : { enabled: false, requestsPerMinute: 60 },
      isPaused: e.isPaused ?? false,
      maintenanceMode: e.maintenanceMode ? JSON.parse(e.maintenanceMode) : { enabled: false, message: '' },
      availabilityWindow: e.availabilityWindow
        ? JSON.parse(e.availabilityWindow)
        : { enabled: false, timezone: 'UTC', schedule: [] },
      alertConfig: e.alertConfig
        ? JSON.parse(e.alertConfig)
        : { enabled: false, errorThresholdPct: 20, notifyEmail: '' },
      tenantConfig: (e as any).tenantConfig
        ? JSON.parse((e as any).tenantConfig)
        : { enabled: false, params: [] },
      responseConfig: e.responseConfig ? JSON.parse(e.responseConfig) : { enabled: false },
      connectionConfig: e.connectionConfig ? JSON.parse(e.connectionConfig) : undefined,
      dbQueries: e.dbQueries ? JSON.parse(e.dbQueries) : [],
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private toEntityFields(data: Partial<SwaggerProjectRecord>): Partial<SwaggerProjectEntity> {
    const e: Partial<SwaggerProjectEntity> = {};
    if (data.name !== undefined) e.name = data.name;
    if (data.baseUrl !== undefined) e.baseUrl = data.baseUrl;
    if (data.description !== undefined) e.description = data.description;
    if (data.version !== undefined) e.version = data.version;
    if ('shareSlug' in data) (e as any).shareSlug = data.shareSlug ?? undefined;
    if (data.rawSpec !== undefined) e.rawSpec = data.rawSpec ? JSON.stringify(data.rawSpec) : undefined;
    if (data.tools !== undefined) e.tools = JSON.stringify(data.tools);
    if (data.auth !== undefined) e.auth = JSON.stringify(data.auth);
    if (data.status !== undefined) e.status = data.status;
    if (data.errorMessage !== undefined) e.errorMessage = data.errorMessage;
    if ('mcpApiKey' in data) e.mcpApiKey = data.mcpApiKey as string | undefined;
    if (data.mcpApiKeys !== undefined) e.mcpApiKeys = JSON.stringify(data.mcpApiKeys);
    if (data.resources !== undefined) e.resources = JSON.stringify(data.resources);
    if (data.prompts !== undefined) e.prompts = JSON.stringify(data.prompts);
    if (data.chains !== undefined) e.chains = JSON.stringify(data.chains);
    if ('oauthClientId' in data) (e as any).oauthClientId = data.oauthClientId;
    if ('oauthClientSecret' in data) (e as any).oauthClientSecret = data.oauthClientSecret;
    if (data.oauthConfig !== undefined) e.oauthConfig = JSON.stringify(data.oauthConfig);
    if (data.tags !== undefined) e.tags = JSON.stringify(data.tags);
    if (data.rateLimit !== undefined) e.rateLimit = JSON.stringify(data.rateLimit);
    if (data.isPaused !== undefined) e.isPaused = data.isPaused;
    if (data.maintenanceMode !== undefined) e.maintenanceMode = JSON.stringify(data.maintenanceMode);
    if (data.availabilityWindow !== undefined) e.availabilityWindow = JSON.stringify(data.availabilityWindow);
    if (data.alertConfig !== undefined) e.alertConfig = JSON.stringify(data.alertConfig);
    if ((data as any).tenantConfig !== undefined) (e as any).tenantConfig = JSON.stringify((data as any).tenantConfig);
    if (data.responseConfig !== undefined) (e as any).responseConfig = JSON.stringify(data.responseConfig);
    if (data.connectionConfig !== undefined) e.connectionConfig = data.connectionConfig ? JSON.stringify(data.connectionConfig) : undefined;
    if (data.dbQueries !== undefined) e.dbQueries = JSON.stringify(data.dbQueries);
    return e;
  }

  async findById(id: string): Promise<SwaggerProjectRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e, true) : null;
  }

  async findByIdOrShareSlug(identifier: string): Promise<SwaggerProjectRecord | null> {
    const where = UUID_RE.test(identifier)
      ? [{ id: identifier }, { shareSlug: identifier }]
      : [{ shareSlug: identifier }];
    const e = await this.repo.findOne({
      where,
    });
    return e ? this.toRecord(e, true) : null;
  }

  async findAll(filter?: { tags?: string[] }): Promise<SwaggerProjectRecord[]> {
    let entities = await this.repo.find({
      select: {
        id: true, name: true, baseUrl: true, description: true, version: true,
        shareSlug: true,
        tools: true, auth: true, status: true, errorMessage: true,
        mcpApiKeys: true, resources: true, prompts: true, tags: true, rateLimit: true, isPaused: true,
        maintenanceMode: true, availabilityWindow: true, alertConfig: true,
        createdAt: true, updatedAt: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (filter?.tags?.length) {
      entities = entities.filter((e) => {
        const t: string[] = e.tags ? JSON.parse(e.tags) : [];
        return filter.tags!.every((tag) => t.includes(tag));
      });
    }

    return entities.map((e) => this.toRecord(e, false));
  }

  async findAllIds(): Promise<string[]> {
    const entities = await this.repo.find({ select: { id: true } });
    return entities.map((e) => e.id);
  }

  async create(data: Omit<SwaggerProjectRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<SwaggerProjectRecord> {
    const entity = this.repo.create(this.toEntityFields(data) as SwaggerProjectEntity);
    const saved = await this.repo.save(entity);
    return this.toRecord(saved, true);
  }

  async update(id: string, data: Partial<Omit<SwaggerProjectRecord, '_id'>>): Promise<SwaggerProjectRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) return null;
    Object.assign(e, this.toEntityFields(data));
    const saved = await this.repo.save(e);
    return this.toRecord(saved, true);
  }

  async save(record: SwaggerProjectRecord): Promise<SwaggerProjectRecord> {
    const e = await this.repo.findOne({ where: { id: record._id } });
    if (!e) throw new NotFoundException('Project not found.');
    Object.assign(e, this.toEntityFields(record));
    const saved = await this.repo.save(e);
    return this.toRecord(saved, true);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

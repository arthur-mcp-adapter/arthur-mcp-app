import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProviderEntity } from '../ai-provider.entity';
import { AiProviderRecord, IAiProviderRepository } from '../ai-provider.repository';

@Injectable()
export class TypeOrmAiProviderRepository implements IAiProviderRepository {
  constructor(@InjectRepository(AiProviderEntity) private readonly repo: Repository<AiProviderEntity>) {}

  private toRecord(e: AiProviderEntity): AiProviderRecord {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      provider: e.provider,
      model: e.model,
      apiKey: e.apiKey,
      baseUrl: e.baseUrl,
      isActive: e.isActive,
      isDefault: e.isDefault,
      lastTestStatus: e.lastTestStatus as AiProviderRecord['lastTestStatus'],
      lastTestedAt: e.lastTestedAt,
      lastTestError: e.lastTestError,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(): Promise<AiProviderRecord[]> {
    const rows = await this.repo.find({ order: { isDefault: 'DESC', createdAt: 'DESC' } });
    return rows.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<AiProviderRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async findDefault(): Promise<AiProviderRecord | null> {
    const e = await this.repo.findOne({ where: { isDefault: true, isActive: true } });
    return e ? this.toRecord(e) : null;
  }

  async create(data: Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiProviderRecord> {
    const e = this.repo.create(data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<AiProviderRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AiProviderRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) return null;
    Object.assign(e, data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async clearDefaultExcept(id?: string): Promise<void> {
    const rows = await this.repo.find({ where: { isDefault: true } });
    await Promise.all(rows.filter((row) => row.id !== id).map((row) => this.repo.save({ ...row, isDefault: false })));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

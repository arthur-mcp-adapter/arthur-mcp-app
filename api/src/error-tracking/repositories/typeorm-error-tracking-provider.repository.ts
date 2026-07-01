import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorTrackingProviderEntity } from '../error-tracking-provider.entity';
import { IErrorTrackingProviderRepository, ErrorTrackingProviderRecord } from '../error-tracking-provider.repository';

@Injectable()
export class TypeOrmErrorTrackingProviderRepository implements IErrorTrackingProviderRepository {
  constructor(
    @InjectRepository(ErrorTrackingProviderEntity)
    private readonly repo: Repository<ErrorTrackingProviderEntity>,
  ) {}

  private toRecord(e: ErrorTrackingProviderEntity): ErrorTrackingProviderRecord {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      tool: e.tool,
      dsn: e.dsn,
      projectName: e.projectName,
      environment: e.environment,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(): Promise<ErrorTrackingProviderRecord[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<ErrorTrackingProviderRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async findActive(): Promise<ErrorTrackingProviderRecord | null> {
    const e = await this.repo.findOne({ where: { isActive: true } });
    return e ? this.toRecord(e) : null;
  }

  async create(data: Omit<ErrorTrackingProviderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ErrorTrackingProviderRecord> {
    const e = this.repo.create(data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<ErrorTrackingProviderRecord, 'id'>>): Promise<ErrorTrackingProviderRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) return null;
    Object.assign(e, data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async deactivateAll(): Promise<void> {
    await this.repo.createQueryBuilder()
      .update()
      .set({ isActive: false })
      .execute();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptEntity } from '../prompt.entity';
import { IPromptRepository, PromptRecord } from '../prompt.repository';

@Injectable()
export class TypeOrmPromptRepository implements IPromptRepository {
  constructor(
    @InjectRepository(PromptEntity) private readonly repo: Repository<PromptEntity>,
  ) {}

  private toRecord(e: PromptEntity): PromptRecord {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      content: e.content,
      tags: e.tagsJson ? JSON.parse(e.tagsJson) : [],
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(): Promise<PromptRecord[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<PromptRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async create(data: Omit<PromptRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptRecord> {
    const entity = this.repo.create({
      name: data.name,
      description: data.description,
      content: data.content,
      tagsJson: JSON.stringify(data.tags ?? []),
    });
    const saved = await this.repo.save(entity);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<PromptRecord, 'id'>>): Promise<PromptRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) return null;

    if (data.name !== undefined) e.name = data.name;
    if (data.description !== undefined) e.description = data.description;
    if (data.content !== undefined) e.content = data.content;
    if (data.tags !== undefined) e.tagsJson = JSON.stringify(data.tags);

    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

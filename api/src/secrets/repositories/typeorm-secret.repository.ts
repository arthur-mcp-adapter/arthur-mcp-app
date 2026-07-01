import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecretEntity } from '../secret.entity';
import { ISecretRepository, SecretRecord } from '../secret.repository';

@Injectable()
export class TypeOrmSecretRepository implements ISecretRepository {
  constructor(
    @InjectRepository(SecretEntity)
    private readonly repo: Repository<SecretEntity>,
  ) {}

  private toRecord(e: SecretEntity): SecretRecord {
    return {
      id: e.id,
      name: e.name,
      value: e.value,
      description: e.description,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(): Promise<SecretRecord[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<SecretRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async findByName(name: string): Promise<SecretRecord | null> {
    const e = await this.repo.findOne({ where: { name } });
    return e ? this.toRecord(e) : null;
  }

  async create(data: Omit<SecretRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecretRecord> {
    const e = this.repo.create(data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<SecretRecord, 'id'>>): Promise<SecretRecord | null> {
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
}

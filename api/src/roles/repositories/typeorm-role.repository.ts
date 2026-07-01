import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../role.entity';
import { IRoleRepository, RoleRecord } from '../role.repository';

@Injectable()
export class TypeOrmRoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repo: Repository<RoleEntity>,
  ) {}

  private toRecord(e: RoleEntity): RoleRecord {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      permissions: e.permissions,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findAll(): Promise<RoleRecord[]> {
    const entities = await this.repo.find({ order: { createdAt: 'ASC' } });
    return entities.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<RoleRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async findByName(name: string): Promise<RoleRecord | null> {
    const e = await this.repo.findOne({ where: { name } });
    return e ? this.toRecord(e) : null;
  }

  async create(data: Omit<RoleRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleRecord> {
    const e = this.repo.create(data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<RoleRecord, 'id'>>): Promise<RoleRecord | null> {
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

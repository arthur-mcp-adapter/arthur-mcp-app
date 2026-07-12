import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../user.entity';
import { IUserRepository, UserRecord } from '../user.repository';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(@InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>) {}

  private toRecord(e: UserEntity): UserRecord {
    return {
      _id: e.id,
      username: e.username,
      email: e.email,
      password: e.password,
      role: e.role,
      googleId: e.googleId,
      githubId: e.githubId,
      supabaseId: e.supabaseId,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { username: username.toLowerCase().trim() } });
    return e ? this.toRecord(e) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
    return e ? this.toRecord(e) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { googleId } });
    return e ? this.toRecord(e) : null;
  }

  async findByGithubId(githubId: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { githubId } });
    return e ? this.toRecord(e) : null;
  }

  async findBySupabaseId(supabaseId: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { supabaseId } });
    return e ? this.toRecord(e) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toRecord(e) : null;
  }

  async findAll(): Promise<Omit<UserRecord, 'password'>[]> {
    const entities = await this.repo.find({
      select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => ({
      _id: e.id,
      username: e.username,
      email: e.email,
      role: e.role,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    googleId?: string;
    githubId?: string;
    supabaseId?: string;
  }): Promise<UserRecord> {
    const entity = this.repo.create({
      username: data.username.toLowerCase().trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      role: data.role ?? 'user',
      googleId: data.googleId ?? null,
      githubId: data.githubId ?? null,
      supabaseId: data.supabaseId ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.toRecord(saved);
  }

  async update(id: string, data: Partial<Omit<UserRecord, '_id'>>): Promise<UserRecord> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('User not found.');
    Object.assign(e, data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async delete(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('User not found.');
  }
}

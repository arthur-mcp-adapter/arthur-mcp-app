import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetEntity } from '../password-reset.entity';
import { IPasswordResetRepository, PasswordResetRecord } from '../password-reset.repository';

@Injectable()
export class TypeOrmPasswordResetRepository implements IPasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetEntity) private readonly repo: Repository<PasswordResetEntity>,
  ) {}

  private toRecord(e: PasswordResetEntity): PasswordResetRecord {
    return {
      _id: e.id,
      userId: e.userId,
      token: e.token,
      expiresAt: e.expiresAt,
      used: e.used,
    };
  }

  async create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordResetRecord> {
    const e = this.repo.create(data);
    const saved = await this.repo.save(e);
    return this.toRecord(saved);
  }

  async findByToken(token: string): Promise<PasswordResetRecord | null> {
    const e = await this.repo.findOne({ where: { token, used: false } });
    return e ? this.toRecord(e) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update(id, { used: true });
  }
}

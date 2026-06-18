import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { USER_REPO } from '../database/database.tokens';
import { IUserRepository, UserRecord } from './user.repository';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(@Inject(USER_REPO) private readonly userRepo: IUserRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    const exists = await this.userRepo.findByUsername('admin');
    if (!exists) {
      await this.create('admin', 'admin', 'admin@mcp-transform.io', 'admin');
    }
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    return this.userRepo.findByUsername(username);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.userRepo.findByEmail(email);
  }

  async create(username: string, password: string, email: string, role = 'user'): Promise<UserRecord> {
    const hash = await bcrypt.hash(password, 10);
    return this.userRepo.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      role,
    });
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async findAll(): Promise<Omit<UserRecord, 'password'>[]> {
    return this.userRepo.findAll();
  }

  async findById(id: string): Promise<UserRecord> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateSelf(
    id: string,
    dto: { username?: string; email?: string; currentPassword?: string; newPassword?: string },
  ): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.findById(id);
    const updates: Partial<Omit<UserRecord, '_id'>> = {};

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Informe a senha atual para definir uma nova.');
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Senha atual incorreta.');
      updates.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.username && dto.username !== user.username) {
      const exists = await this.userRepo.findByUsername(dto.username);
      if (exists) throw new ConflictException('Username already taken.');
      updates.username = dto.username.toLowerCase().trim();
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findByEmail(dto.email);
      if (exists) throw new ConflictException('Email already in use.');
      updates.email = dto.email.toLowerCase().trim();
    }

    const updated = await this.userRepo.update(id, updates);
    const { password: _, ...safe } = updated;
    return safe;
  }

  async updateByAdmin(
    id: string,
    dto: { username?: string; email?: string; password?: string; role?: string },
  ): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.findById(id);
    const updates: Partial<Omit<UserRecord, '_id'>> = {};

    if (dto.username && dto.username !== user.username) {
      const exists = await this.userRepo.findByUsername(dto.username);
      if (exists) throw new ConflictException('Username already taken.');
      updates.username = dto.username.toLowerCase().trim();
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findByEmail(dto.email);
      if (exists) throw new ConflictException('Email already in use.');
      updates.email = dto.email.toLowerCase().trim();
    }

    if (dto.password) updates.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) updates.role = dto.role;

    const updated = await this.userRepo.update(id, updates);
    const { password: _, ...safe } = updated;
    return safe;
  }

  async remove(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }
}

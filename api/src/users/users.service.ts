import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { USER_REPO } from '../database/database.tokens';
import { IUserRepository, UserRecord } from './user.repository';

@Injectable()
export class UsersService {
  constructor(@Inject(USER_REPO) private readonly userRepo: IUserRepository) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    return this.userRepo.findByUsername(username);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.userRepo.findByEmail(email);
  }

  async create(username: string, password: string, email: string, role = 'admin'): Promise<UserRecord> {
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
      if (!dto.currentPassword) throw new BadRequestException('Please provide your current password to set a new one.');
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Incorrect current password.');
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

  /** Finds the user linked to an OAuth identity, links it to a matching email, or creates a new account. */
  async findOrCreateFromOAuth(
    provider: 'google' | 'github',
    profile: { id: string; email: string; name?: string },
  ): Promise<UserRecord> {
    const existing =
      provider === 'google'
        ? await this.userRepo.findByGoogleId(profile.id)
        : await this.userRepo.findByGithubId(profile.id);
    if (existing) return existing;

    const providerField = provider === 'google' ? { googleId: profile.id } : { githubId: profile.id };

    const byEmail = await this.userRepo.findByEmail(profile.email);
    if (byEmail) return this.userRepo.update(byEmail._id, providerField);

    const username = await this.generateUniqueUsername(profile.name || profile.email.split('@')[0]);
    const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    return this.userRepo.create({ username, email: profile.email, password, role: 'admin', ...providerField });
  }

  private async generateUniqueUsername(seed: string): Promise<string> {
    const base = seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40).padEnd(3, '0') || 'user';
    let candidate = base;
    let suffix = 0;
    while (await this.userRepo.findByUsername(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }
}

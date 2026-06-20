import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { config } from '../config/configuration';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

interface AuthCode {
  userId: string;
  username: string;
  role: string;
  projectId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  expiresAt: number;
}

@Injectable()
export class OAuthService {
  private readonly codes = new Map<string, AuthCode>();

  constructor(
    private readonly users: UsersService,
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  async validateClient(projectId: string, clientId: string, clientSecret?: string): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new UnauthorizedException('Project not found');
    if (!project.oauthClientId) throw new UnauthorizedException('OAuth not configured for this project');
    if (project.oauthClientId !== clientId) throw new UnauthorizedException('invalid_client');
    if (clientSecret !== undefined && project.oauthClientSecret !== clientSecret) {
      throw new UnauthorizedException('invalid_client');
    }
  }

  async validateUser(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    const valid = await this.users.validatePassword(password, user.password);
    if (!valid) return null;
    return { _id: user._id, username: user.username, role: user.role };
  }

  createCode(
    userId: string,
    username: string,
    role: string,
    projectId: string,
    clientId: string,
    redirectUri: string,
    state: string,
  ): string {
    const code = crypto.randomBytes(32).toString('hex');
    this.codes.set(code, {
      userId, username, role, projectId, clientId, redirectUri, state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return code;
  }

  consumeCode(code: string, projectId: string, clientId: string, redirectUri: string): AuthCode | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.codes.delete(code); return null; }
    if (entry.projectId !== projectId) return null;
    if (entry.clientId !== clientId) return null;
    if (entry.redirectUri !== redirectUri) return null;
    this.codes.delete(code);
    return entry;
  }

  issueToken(userId: string, username: string, role: string, projectId: string): string {
    return jwt.sign(
      { sub: userId, username, role, projectId },
      config.jwtSecret,
      { expiresIn: '24h' },
    );
  }

  verifyToken(token: string): { sub: string; username: string; role: string; projectId?: string } | null {
    try {
      return jwt.verify(token, config.jwtSecret) as { sub: string; username: string; role: string; projectId?: string };
    } catch {
      return null;
    }
  }
}

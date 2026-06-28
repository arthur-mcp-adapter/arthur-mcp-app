import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';

interface AuthCode {
  userId: string;
  username: string;
  role: string;
  serverId: string;
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
    private readonly jwtSecretService: JwtSecretService,
  ) {}

  async validateClient(serverId: string, clientId: string, clientSecret?: string): Promise<void> {
    const server = await this.projectRepo.findById(serverId);
    if (!server) throw new UnauthorizedException('Server not found');
    if (!server.oauthClientId) throw new UnauthorizedException('OAuth not configured for this server');
    if (server.oauthClientId !== clientId) throw new UnauthorizedException('invalid_client');
    if (clientSecret !== undefined && server.oauthClientSecret !== clientSecret) {
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
    serverId: string,
    clientId: string,
    redirectUri: string,
    state: string,
  ): string {
    const code = crypto.randomBytes(32).toString('hex');
    this.codes.set(code, {
      userId, username, role, serverId, clientId, redirectUri, state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return code;
  }

  consumeCode(code: string, serverId: string, clientId: string, redirectUri: string): AuthCode | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.codes.delete(code); return null; }
    if (entry.serverId !== serverId) return null;
    if (entry.clientId !== clientId) return null;
    if (entry.redirectUri !== redirectUri) return null;
    this.codes.delete(code);
    return entry;
  }

  async issueToken(userId: string, username: string, role: string, serverId: string): Promise<string> {
    return jwt.sign(
      { sub: userId, username, role, serverId },
      await this.jwtSecretService.getSecret(),
      { expiresIn: '24h' },
    );
  }

  async verifyToken(token: string): Promise<{ sub: string; username: string; role: string; serverId?: string } | null> {
    try {
      return jwt.verify(token, await this.jwtSecretService.getSecret()) as { sub: string; username: string; role: string; serverId?: string };
    } catch {
      return null;
    }
  }
}

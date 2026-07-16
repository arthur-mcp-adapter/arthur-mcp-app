import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { config } from '../config/configuration';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository, SwaggerProjectRecord } from '../swagger/swagger-project.repository';
import { JwtSecretService } from '../settings/jwt-secret.service';
import type { OAuthConfig } from './oauth-config.type';

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
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    private readonly jwtSecretService: JwtSecretService,
  ) {}

  resolveConfig(server: SwaggerProjectRecord): OAuthConfig {
    if (server.oauthConfig && server.oauthConfig.mode !== 'none') return server.oauthConfig;
    return server.oauthClientId ? { mode: 'managed' } : { mode: 'none' };
  }

  async findServer(serverId: string): Promise<SwaggerProjectRecord | null> {
    return this.projectRepo.findByIdOrShareSlug(serverId);
  }

  async validateClient(serverId: string, clientId: string, clientSecret?: string): Promise<SwaggerProjectRecord> {
    const server = await this.projectRepo.findByIdOrShareSlug(serverId);
    if (!server) throw new UnauthorizedException('Server not found');
    if (this.resolveConfig(server).mode !== 'managed') {
      throw new UnauthorizedException('Arthur-managed OAuth is not enabled for this server');
    }
    if (!server.oauthClientId) throw new UnauthorizedException('OAuth not configured for this server');
    if (server.oauthClientId !== clientId) throw new UnauthorizedException('invalid_client');
    if (clientSecret !== undefined && server.oauthClientSecret !== clientSecret) {
      throw new UnauthorizedException('invalid_client');
    }
    return server;
  }

  /** Same identity source as everything else — the MCP-client login form authenticates
   * against Supabase directly (password grant) rather than a local table. Lazy-imports
   * `@supabase/supabase-js`, same reasoning as SupabaseAdminService. */
  async validateUser(email: string, password: string) {
    if (!config.supabaseUrl || !config.supabasePublishableKey) return null;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    return {
      _id: data.user.id,
      username: (data.user.user_metadata?.username as string | undefined) ?? email.split('@')[0],
      role: (data.user.app_metadata?.role as string | undefined) ?? 'admin',
    };
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

  async issueClientCredentialsToken(clientId: string, serverId: string): Promise<string> {
    return jwt.sign(
      { sub: clientId, clientId, role: 'oauth-client', serverId },
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

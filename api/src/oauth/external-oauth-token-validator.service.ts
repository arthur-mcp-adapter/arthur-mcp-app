import { createPublicKey, type JsonWebKey } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import type { OAuthConfig } from './oauth-config.type';

type ExternalOAuthConfig = Extract<OAuthConfig, { mode: 'external' }>;

@Injectable()
export class ExternalOAuthTokenValidatorService {
  private readonly jwksCache = new Map<string, { expiresAt: number; keys: JsonWebKey[] }>();

  async validate(token: string, config: ExternalOAuthConfig): Promise<Record<string, unknown>> {
    try {
      const looksLikeJwt = token.split('.').length === 3;
      const payload = looksLikeJwt && config.jwksUrl
        ? await this.validateJwt(token, config)
        : config.introspectionUrl
          ? await this.introspect(token, config)
          : await this.validateJwt(token, config);
      this.validateClaims(payload, config);
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired external OAuth token.');
    }
  }

  private async validateJwt(token: string, config: ExternalOAuthConfig): Promise<Record<string, unknown>> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid || !decoded.header.alg) {
      throw new UnauthorizedException('External OAuth token must be a signed JWT with kid and alg headers.');
    }
    if (!['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'].includes(decoded.header.alg)) {
      throw new UnauthorizedException('External OAuth token uses an unsupported signing algorithm.');
    }

    let keys = await this.getJwks(config.jwksUrl!, false);
    let key = keys.find((candidate: any) => candidate.kid === decoded.header.kid);
    if (!key) {
      keys = await this.getJwks(config.jwksUrl!, true);
      key = keys.find((candidate: any) => candidate.kid === decoded.header.kid);
    }
    if (!key) throw new UnauthorizedException('External OAuth signing key was not found.');

    const publicKey = createPublicKey({ key, format: 'jwk' });
    return jwt.verify(token, publicKey, {
      algorithms: [decoded.header.alg as jwt.Algorithm],
      issuer: config.issuer,
      audience: config.audience,
    }) as Record<string, unknown>;
  }

  private async introspect(token: string, config: ExternalOAuthConfig): Promise<Record<string, unknown>> {
    if (!config.introspectionUrl || !config.introspectionClientId || !config.introspectionClientSecret) {
      throw new UnauthorizedException('External OAuth introspection is not fully configured.');
    }
    const body = new URLSearchParams({ token });
    const response = await axios.post(config.introspectionUrl, body.toString(), {
      auth: {
        username: config.introspectionClientId,
        password: config.introspectionClientSecret,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });
    if (!response.data?.active) throw new UnauthorizedException('External OAuth token is inactive.');
    return response.data as Record<string, unknown>;
  }

  private async getJwks(url: string, forceRefresh: boolean): Promise<JsonWebKey[]> {
    const cached = this.jwksCache.get(url);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.keys;
    const response = await axios.get(url, { timeout: 5000 });
    if (!Array.isArray(response.data?.keys)) throw new UnauthorizedException('Invalid JWKS response.');
    const keys = response.data.keys as JsonWebKey[];
    this.jwksCache.set(url, { keys, expiresAt: Date.now() + 5 * 60 * 1000 });
    return keys;
  }

  private validateClaims(payload: Record<string, unknown>, config: ExternalOAuthConfig): void {
    if (payload.iss !== undefined && payload.iss !== config.issuer) {
      throw new UnauthorizedException('External OAuth token issuer does not match.');
    }
    if (payload.aud === undefined) {
      throw new UnauthorizedException('External OAuth token does not declare an audience.');
    }
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(config.audience)) {
      throw new UnauthorizedException('External OAuth token audience does not match.');
    }
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('External OAuth token has expired.');
    }

    const granted = new Set([
      ...(typeof payload.scope === 'string' ? payload.scope.split(/\s+/) : []),
      ...(Array.isArray(payload.scp) ? payload.scp.filter((scope): scope is string => typeof scope === 'string') : []),
    ]);
    const missing = config.scopes.filter((scope) => !granted.has(scope));
    if (missing.length) throw new UnauthorizedException(`Missing required OAuth scopes: ${missing.join(', ')}`);
  }
}

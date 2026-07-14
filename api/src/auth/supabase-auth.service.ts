import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config/configuration';
import { UsersService } from '../users/users.service';

/** Shape `JwtStrategy.validate()` produces — what every guard/controller reads as `req.user`. */
export interface RequestUser {
  userId: string;
  username: string;
  role: string;
}

/**
 * Fallback identity provider: verifies a Supabase Auth JWT (via the project's JWKS) and
 * resolves it to an internal user, same pattern as Google/GitHub OAuth linking.
 * Only active when SUPABASE_URL is configured — otherwise every call is a no-op.
 *
 * `@supabase/server` is loaded lazily (dynamic import) rather than as a static top-level
 * import: its `.cjs` build isn't Jest/ts-jest-CommonJS-transform-friendly (loading it eagerly
 * breaks every spec file that transitively imports JwtAuthGuard — i.e. nearly all of them).
 * Loading it only inside tryAuthenticate, after the config.supabaseUrl gate, means it's never
 * touched unless Supabase auth is actually configured and in use — same lazy-require pattern
 * already used for optional drivers in dynamic-mcp/adapters/*.ts.
 *
 * Uses the root `createSupabaseContext` (not `@supabase/server/core`'s `verifyCredentials`)
 * because the `/core` subpath export needs `moduleResolution: node16+`, which this project's
 * tsconfig doesn't use — `createSupabaseContext` just needs a Web-standard `Request`, which
 * Node 20+ provides as a global, so a minimal one built from the Bearer header works fine.
 */
@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);

  constructor(private readonly users: UsersService) {}

  async tryAuthenticate(token: string | undefined): Promise<RequestUser | null> {
    if (!config.supabaseUrl || !token) return null;

    const { createSupabaseContext } = await import('@supabase/server');
    const fakeRequest = new Request('http://localhost/', { headers: { authorization: `Bearer ${token}` } });
    const { data: auth, error } = await createSupabaseContext(fakeRequest, { auth: 'user' });
    if (error || !auth?.userClaims?.email) return null;

    try {
      const user = await this.users.findOrCreateFromOAuth('supabase', {
        id: auth.userClaims.id,
        email: auth.userClaims.email,
        name: (auth.userClaims.userMetadata?.name as string | undefined) ?? (auth.userClaims.userMetadata?.full_name as string | undefined),
      });
      return { userId: user._id, username: user.username, role: user.role };
    } catch (err: any) {
      this.logger.warn(`Supabase JWT verified but user resolution failed: ${err?.message}`);
      return null;
    }
  }
}

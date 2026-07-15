import { Injectable, Logger } from '@nestjs/common';

/** Shape every guard/controller reads as `req.user`. */
export interface RequestUser {
  userId: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Sole identity verification path: verifies a Supabase Auth JWT (via the project's JWKS) and
 * maps its claims directly to `RequestUser` — no local table, no DB read.
 *
 * `role` comes from the Supabase user's `app_metadata.role` claim, embedded in the JWT itself
 * (no extra round trip). It defaults to 'admin' when absent — this matters for brand-new
 * Google/GitHub signups via Supabase's native OAuth, which our backend never touches at
 * creation time and so never gets a chance to set app_metadata on: without this default, such a
 * user's very first access token would 403 every PermissionsGuard-protected route until a
 * natural token refresh. Email/password signups get the claim baked in explicitly at creation
 * (see SupabaseAdminService.linkUser), so this default is really only load-bearing for OAuth.
 *
 * `@supabase/server` is loaded lazily (dynamic import) rather than as a static top-level
 * import: its `.cjs` build isn't Jest/ts-jest-CommonJS-transform-friendly (loading it eagerly
 * breaks every spec file that transitively imports JwtAuthGuard — i.e. nearly all of them).
 *
 * Uses the root `createSupabaseContext` (not `@supabase/server/core`'s `verifyCredentials`)
 * because the `/core` subpath export needs `moduleResolution: node16+`, which this project's
 * tsconfig doesn't use — `createSupabaseContext` just needs a Web-standard `Request`, which
 * Node 20+ provides as a global, so a minimal one built from the Bearer header works fine.
 */
@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);

  async tryAuthenticate(token: string | undefined): Promise<RequestUser | null> {
    if (!token) return null;

    const { createSupabaseContext } = await import('@supabase/server');
    const fakeRequest = new Request('http://localhost/', { headers: { authorization: `Bearer ${token}` } });
    const { data: auth, error } = await createSupabaseContext(fakeRequest, { auth: 'user' });
    if (error || !auth?.userClaims?.email) return null;

    const claims = auth.userClaims;
    return {
      userId: claims.id,
      email: claims.email,
      username: (claims.userMetadata?.username as string | undefined) ?? claims.email.split('@')[0],
      role: (claims.appMetadata?.role as string | undefined) ?? 'admin',
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config/configuration';

/**
 * Provisions the corresponding Supabase Auth user for a local account, using the service-role
 * secret key (Admin API — writes to Supabase, unlike the read-only SupabaseAuthService). Only
 * active when SUPABASE_URL + SUPABASE_SECRET_KEY are configured — otherwise every call is a
 * no-op, same gating pattern as SupabaseAuthService. Lazily imports `@supabase/supabase-js` for
 * the same Jest/CJS-transform reason documented on SupabaseAuthService.
 */
@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);

  get isConfigured(): boolean {
    return !!(config.supabaseUrl && config.supabaseSecretKey);
  }

  private async client() {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(config.supabaseUrl!, config.supabaseSecretKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Creates (or, if already registered, looks up) the Supabase Auth user for a local account and returns its id. */
  async linkUser(
    email: string,
    password?: string,
    name?: string,
    appMetadata?: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.isConfigured) return null;
    const supabase = await this.client();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { username: name } : undefined,
      app_metadata: appMetadata,
    });
    if (!error) return data.user.id;

    if (!error.message?.toLowerCase().includes('already been registered')) {
      this.logger.warn(`Supabase user provisioning failed for ${email}: ${error.message}`);
      return null;
    }

    const listResult = await supabase.auth.admin.listUsers();
    const users: { id: string; email?: string }[] = listResult.data.users;
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) {
      this.logger.warn(`Supabase user lookup failed for ${email}${listResult.error ? `: ${listResult.error.message}` : ''}`);
      return null;
    }

    // createUser() above never reaches app_metadata for an already-registered account — patch it
    // here too, or a re-run signup/backfill silently leaves the role claim empty.
    if (appMetadata) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(match.id, { app_metadata: appMetadata });
      if (updateError) this.logger.warn(`Supabase app_metadata update failed for ${email}: ${updateError.message}`);
    }
    return match.id;
  }
}

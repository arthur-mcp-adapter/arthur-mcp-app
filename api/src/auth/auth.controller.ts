import { Controller, Get } from '@nestjs/common';
import { config } from '../config/configuration';

// Signup, login, OAuth, password reset, and profile edits all talk to Supabase Auth directly
// from the frontend (publishable key) — `role` isn't set here either: it defaults to 'admin'
// when the app_metadata.role claim is absent (see SupabaseAuthService), the same default this
// app already gives every new account, so there's nothing left that needs the service-role key
// on the signup path.
@Controller('auth')
export class AuthController {
  @Get('providers')
  providers(): { selfHosted: boolean } {
    return { selfHosted: config.selfHosted };
  }
}

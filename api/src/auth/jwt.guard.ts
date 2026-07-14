import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly supabaseAuth: SupabaseAuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      const req = context.switchToHttp().getRequest();
      const token = (req.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
      const user = await this.supabaseAuth.tryAuthenticate(token);
      if (!user) throw err;
      req.user = user;
      return true;
    }
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = (req.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
    const user = await this.supabaseAuth.tryAuthenticate(token);
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}

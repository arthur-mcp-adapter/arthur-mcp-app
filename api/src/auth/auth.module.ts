import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAdminService } from './supabase-admin.service';

// Global: JwtAuthGuard is used via @UseGuards(JwtAuthGuard) across many feature
// modules that don't import AuthModule — its Supabase dependency must resolve
// from anywhere, same reasoning as DatabaseModule being global.
@Global()
@Module({
  controllers: [AuthController],
  providers: [JwtAuthGuard, SupabaseAuthService, SupabaseAdminService],
  exports: [JwtAuthGuard, SupabaseAuthService, SupabaseAdminService],
})
export class AuthModule {}

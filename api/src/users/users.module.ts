import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// UsersService (and the local `users` table it backs) is legacy at this point — Supabase Auth
// is the sole identity source and UsersController's /users/me reads claims directly, no DB read.
// UsersService survives only for the Supabase backfill script (see backfillSupabaseLinks) until
// that one-off migration step is done and the local table is dropped.
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

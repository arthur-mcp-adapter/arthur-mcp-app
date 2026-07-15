import { Controller, Get, Inject, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequestUser } from '../auth/supabase-auth.service';
import { ROLE_REPO } from '../database/database.tokens';
import { IRoleRepository } from '../roles/role.repository';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(ROLE_REPO) private readonly roleRepo: IRoleRepository) {}

  /** Authenticated user profile — built entirely from the verified Supabase JWT claims (no DB
   * read), plus role permissions so the frontend can enforce them. Self-service profile edits
   * (username/email/password) go straight from the frontend to Supabase now — there is no
   * PATCH here anymore. */
  @Get('me')
  async getMe(@Request() req: { user: RequestUser }) {
    const { userId, username, email, role } = req.user;
    const me: { _id: string; username: string; email: string; role: string; permissions?: unknown } = {
      _id: userId,
      username,
      email,
      role,
    };

    if (role !== 'admin') {
      const roleRecord = await this.roleRepo.findByName(role);
      if (roleRecord) me.permissions = roleRecord.permissions;
    }

    return me;
  }
}

import { Body, Controller, Get, Inject, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ROLE_REPO } from '../database/database.tokens';
import { IRoleRepository } from '../roles/role.repository';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepository,
  ) {}

  /** Authenticated user profile — includes role permissions so the frontend can enforce them */
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    const { password: _, ...safe } = user as any;

    if (safe.role !== 'admin') {
      const role = await this.roleRepo.findByName(safe.role);
      if (role) {
        safe.permissions = role.permissions;
      }
    }

    return safe;
  }

  /** Update own profile */
  @Patch('me')
  updateMe(
    @Request() req: any,
    @Body() dto: { username?: string; email?: string; currentPassword?: string; newPassword?: string },
  ) {
    return this.usersService.updateSelf(req.user.userId, dto);
  }
}

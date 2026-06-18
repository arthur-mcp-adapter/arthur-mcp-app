import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Authenticated user profile */
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    const { password: _, ...safe } = user;
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

  /** List all users — admin only */
  @Get()
  findAll(@Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores.');
    return this.usersService.findAll();
  }

  /** Create new user — admin only */
  @Post()
  @HttpCode(201)
  async create(
    @Request() req: any,
    @Body() dto: { username: string; email: string; password: string; role?: string },
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores.');
    const user = await this.usersService.create(dto.username, dto.password, dto.email, dto.role ?? 'user');
    this.auditLogs.log({ userId: req.user.userId, username: req.user.username, action: 'create', entity: 'user', entityId: String(user._id), entityName: dto.username, ip: req.ip });
    return user;
  }

  /** Edit any user — admin only */
  @Patch(':id')
  async updateUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { username?: string; email?: string; password?: string; role?: string },
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores.');
    const user = await this.usersService.updateByAdmin(id, dto);
    this.auditLogs.log({ userId: req.user.userId, username: req.user.username, action: 'update', entity: 'user', entityId: id, entityName: dto.username, ip: req.ip });
    return user;
  }

  /** Delete user — admin only (cannot delete own account) */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores.');
    if (req.user.userId === id) throw new ForbiddenException('Cannot delete your own account.');
    await this.usersService.remove(id);
    this.auditLogs.log({ userId: req.user.userId, username: req.user.username, action: 'delete', entity: 'user', entityId: id, ip: req.ip });
  }
}

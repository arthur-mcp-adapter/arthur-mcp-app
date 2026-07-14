import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { ROLE_REPO } from '../../database/database.tokens';
import type { IRoleRepository } from '../../roles/role.repository';

type PermMap = Record<string, boolean>;

const BUILTIN: Record<string, PermMap> = {
  developer: {
    servers_view: true, servers_create: true, servers_edit_settings: true, servers_manage_connection: true, servers_delete: false,
    servers_toggle_active: true, servers_share: true,
    tools_view: true, tools_create: true, tools_edit: true, tools_delete: true, tools_test: true,
    resources_view: true, resources_create: true, resources_edit: true, resources_delete: true,
    prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: true,
    secrets_view_names: true, secrets_reveal_values: false, secrets_create: false, secrets_edit: false, secrets_delete: false,
    api_keys_view: true, api_keys_create: true, api_keys_delete: true,
    users_view: false, users_invite: false, users_edit: false, users_delete: false,
    roles_view: false, roles_manage: false,
    audit_view: true, audit_export: false, templates_use: true,
    error_tracking_view: true, error_tracking_create: true, error_tracking_edit: true, error_tracking_delete: true,
    ai_providers_view: true, ai_providers_create: true, ai_providers_edit: true, ai_providers_delete: true,
  },
  editor: {
    servers_view: true, servers_create: false, servers_edit_settings: false, servers_manage_connection: false, servers_delete: false,
    servers_toggle_active: false, servers_share: true,
    tools_view: true, tools_create: true, tools_edit: true, tools_delete: false, tools_test: true,
    resources_view: true, resources_create: true, resources_edit: true, resources_delete: false,
    prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: false,
    secrets_view_names: true, secrets_reveal_values: false, secrets_create: false, secrets_edit: false, secrets_delete: false,
    api_keys_view: true, api_keys_create: false, api_keys_delete: false,
    users_view: false, users_invite: false, users_edit: false, users_delete: false,
    roles_view: false, roles_manage: false,
    audit_view: false, audit_export: false, templates_use: true,
    error_tracking_view: true, error_tracking_create: true, error_tracking_edit: true, error_tracking_delete: false,
    ai_providers_view: true, ai_providers_create: true, ai_providers_edit: true, ai_providers_delete: false,
  },
  viewer: {
    servers_view: true, servers_create: false, servers_edit_settings: false, servers_manage_connection: false, servers_delete: false,
    servers_toggle_active: false, servers_share: false,
    tools_view: true, tools_create: false, tools_edit: false, tools_delete: false, tools_test: false,
    resources_view: true, resources_create: false, resources_edit: false, resources_delete: false,
    prompts_view: true, prompts_create: false, prompts_edit: false, prompts_delete: false,
    secrets_view_names: false, secrets_reveal_values: false, secrets_create: false, secrets_edit: false, secrets_delete: false,
    api_keys_view: false, api_keys_create: false, api_keys_delete: false,
    users_view: false, users_invite: false, users_edit: false, users_delete: false,
    roles_view: false, roles_manage: false,
    audit_view: false, audit_export: false, templates_use: false,
    error_tracking_view: true, error_tracking_create: false, error_tracking_edit: false, error_tracking_delete: false,
    ai_providers_view: true, ai_providers_create: false, ai_providers_edit: false, ai_providers_delete: false,
  },
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; username: string; role: string } | undefined;
    if (!user) return false;

    if (user.role === 'admin') return true;

    const builtin = BUILTIN[user.role];
    if (builtin) {
      if (!builtin[permission]) throw new ForbiddenException(`Permission denied: ${permission}`);
      return true;
    }

    // Dynamic role — look up from DB
    const role = await this.roleRepo.findByName(user.role);
    if (!role) throw new ForbiddenException(`Unknown role: ${user.role}`);
    if (!role.permissions[permission]) throw new ForbiddenException(`Permission denied: ${permission}`);
    return true;
  }
}

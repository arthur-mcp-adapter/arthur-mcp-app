import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPO } from '../database/database.tokens';
import { IRoleRepository, RolePermissions, RoleRecord } from './role.repository';

const ALL_PERMISSIONS_OFF: RolePermissions = {
  servers_view: false, servers_create: false, servers_edit_settings: false, servers_manage_connection: false,
  servers_delete: false, servers_toggle_active: false, servers_share: false,
  tools_view: false, tools_create: false, tools_edit: false,
  tools_delete: false, tools_test: false, endpoints_create: false,
  resources_view: false, resources_create: false, resources_edit: false, resources_delete: false,
  prompts_view: false, prompts_create: false, prompts_edit: false, prompts_delete: false,
  secrets_view_names: false, secrets_reveal_values: false, secrets_create: false,
  secrets_edit: false, secrets_delete: false,
  api_keys_view: false, api_keys_create: false, api_keys_delete: false,
  users_view: false, users_invite: false, users_edit: false, users_delete: false,
  roles_view: false, roles_manage: false,
  audit_view: false, audit_export: false, templates_use: false,
  settings_manage: false,
  observability_view: false, observability_create: false, observability_edit: false, observability_delete: false,
  error_tracking_view: false, error_tracking_create: false, error_tracking_edit: false, error_tracking_delete: false,
  ai_providers_view: false, ai_providers_create: false, ai_providers_edit: false, ai_providers_delete: false, ai_providers_execute: false,
};

@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_REPO) private readonly roleRepo: IRoleRepository,
  ) {}

  findAll(): Promise<RoleRecord[]> {
    return this.roleRepo.findAll();
  }

  async findById(id: string): Promise<RoleRecord> {
    const r = await this.roleRepo.findById(id);
    if (!r) throw new NotFoundException('Role not found.');
    return r;
  }

  async create(dto: { name: string; description?: string; permissions?: Partial<RolePermissions> }): Promise<RoleRecord> {
    if (!dto.name?.trim()) throw new BadRequestException('name is required.');
    const existing = await this.roleRepo.findByName(dto.name.trim());
    if (existing) throw new BadRequestException(`A role named "${dto.name.trim()}" already exists.`);
    return this.roleRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      permissions: { ...ALL_PERMISSIONS_OFF, ...dto.permissions },
    });
  }

  async update(id: string, dto: { name?: string; description?: string; permissions?: Partial<RolePermissions> }): Promise<RoleRecord> {
    const r = await this.roleRepo.findById(id);
    if (!r) throw new NotFoundException('Role not found.');
    if (dto.name !== undefined && dto.name.trim() !== r.name) {
      const existing = await this.roleRepo.findByName(dto.name.trim());
      if (existing) throw new BadRequestException(`A role named "${dto.name.trim()}" already exists.`);
    }
    const updated = await this.roleRepo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || undefined } : {}),
      ...(dto.permissions !== undefined ? { permissions: { ...r.permissions, ...dto.permissions } } : {}),
    });
    if (!updated) throw new NotFoundException('Role not found.');
    return updated;
  }

  async delete(id: string): Promise<void> {
    const ok = await this.roleRepo.delete(id);
    if (!ok) throw new NotFoundException('Role not found.');
  }
}

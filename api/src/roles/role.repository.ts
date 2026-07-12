export interface RolePermissions {
  servers_view: boolean; servers_create: boolean; servers_edit_settings: boolean;
  servers_manage_connection: boolean;
  servers_delete: boolean; servers_toggle_active: boolean; servers_share: boolean;
  tools_view: boolean; tools_create: boolean; tools_edit: boolean;
  tools_delete: boolean; tools_test: boolean; endpoints_create: boolean;
  resources_view: boolean; resources_create: boolean; resources_edit: boolean; resources_delete: boolean;
  prompts_view: boolean; prompts_create: boolean; prompts_edit: boolean; prompts_delete: boolean;
  secrets_view_names: boolean; secrets_reveal_values: boolean; secrets_create: boolean;
  secrets_edit: boolean; secrets_delete: boolean;
  api_keys_view: boolean; api_keys_create: boolean; api_keys_delete: boolean;
  users_view: boolean; users_invite: boolean; users_edit: boolean; users_delete: boolean;
  roles_view: boolean; roles_manage: boolean;
  audit_view: boolean; audit_export: boolean; templates_use: boolean;
  settings_manage: boolean;
  observability_view: boolean; observability_create: boolean; observability_edit: boolean; observability_delete: boolean;
  error_tracking_view: boolean; error_tracking_create: boolean; error_tracking_edit: boolean; error_tracking_delete: boolean;
  ai_providers_view: boolean; ai_providers_create: boolean; ai_providers_edit: boolean; ai_providers_delete: boolean; ai_providers_execute: boolean;
}

export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  permissions: RolePermissions;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleRepository {
  findAll(): Promise<RoleRecord[]>;
  findById(id: string): Promise<RoleRecord | null>;
  findByName(name: string): Promise<RoleRecord | null>;
  create(data: Omit<RoleRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleRecord>;
  update(id: string, data: Partial<Omit<RoleRecord, 'id'>>): Promise<RoleRecord | null>;
  delete(id: string): Promise<boolean>;
}

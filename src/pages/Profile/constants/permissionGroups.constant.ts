import type { RolePermissions } from '../rolePermissions.interface'

export const PERMISSION_GROUPS: {
  label: string
  keys: (keyof RolePermissions)[]
}[] = [
  { label: 'Servers',      keys: ['servers_view', 'servers_create', 'servers_edit_settings', 'servers_delete', 'servers_toggle_active', 'servers_share'] },
  { label: 'Tools',        keys: ['tools_view', 'tools_create', 'tools_edit', 'tools_delete', 'tools_test', 'endpoints_create'] },
  { label: 'Resources',    keys: ['resources_view', 'resources_create', 'resources_edit', 'resources_delete'] },
  { label: 'Prompts',      keys: ['prompts_view', 'prompts_create', 'prompts_edit', 'prompts_delete'] },
  { label: 'Secrets',      keys: ['secrets_view_names', 'secrets_reveal_values', 'secrets_create', 'secrets_edit', 'secrets_delete'] },
  { label: 'API Keys',     keys: ['api_keys_view', 'api_keys_create', 'api_keys_delete'] },
  { label: 'Users & Roles', keys: ['users_view', 'users_invite', 'users_edit', 'users_delete', 'roles_view', 'roles_manage'] },
  { label: 'Audit & Logs', keys: ['audit_view', 'audit_export'] },
  { label: 'Templates',    keys: ['templates_use'] },
  { label: 'Settings',       keys: ['settings_manage'] },
  { label: 'Observability',  keys: ['observability_view', 'observability_create', 'observability_edit', 'observability_delete'] },
  { label: 'Error Tracking', keys: ['error_tracking_view', 'error_tracking_create', 'error_tracking_edit', 'error_tracking_delete'] },
  { label: 'AI Providers',   keys: ['ai_providers_view', 'ai_providers_create', 'ai_providers_edit', 'ai_providers_delete', 'ai_providers_execute'] },
]

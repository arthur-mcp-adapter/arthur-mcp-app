import type { Role } from '../role.interface'
import { ALL_OFF } from './allOff.constant'
import type { RolePermissions } from '../rolePermissions.interface'

export const BUILTIN_ROLES: Role[] = [
  {
    _id: 'admin',
    name: 'Administrator',
    builtin: true,
    permissions: Object.fromEntries(Object.keys(ALL_OFF).map((k) => [k, true])) as unknown as RolePermissions,
  },
  {
    _id: 'developer',
    name: 'Developer',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true, servers_create: true, servers_edit_settings: true, servers_delete: false,
      servers_toggle_active: true, servers_share: true,
      tools_view: true, tools_create: true, tools_edit: true, tools_delete: true, tools_test: true, endpoints_create: true,
      resources_view: true, resources_create: true, resources_edit: true, resources_delete: true,
      prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: true,
      secrets_view_names: true, secrets_reveal_values: false,
      api_keys_view: true, api_keys_create: true, api_keys_delete: false,
      users_view: true, roles_view: true,
      audit_view: true, templates_use: true,
      observability_view: true,
      error_tracking_view: true, error_tracking_create: true, error_tracking_edit: true, error_tracking_delete: true,
      ai_providers_view: true, ai_providers_create: true, ai_providers_edit: true, ai_providers_delete: true,
      ai_providers_execute: true,
    },
  },
  {
    _id: 'editor',
    name: 'Editor',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true,
      tools_view: true, tools_create: true, tools_edit: true, tools_delete: true, tools_test: true, endpoints_create: true,
      resources_view: true, resources_create: true, resources_edit: true, resources_delete: true,
      prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: true,
      secrets_view_names: true,
      users_view: true,
      templates_use: true,
      observability_view: true,
      error_tracking_view: true, error_tracking_create: true, error_tracking_edit: true,
      ai_providers_view: true, ai_providers_create: true, ai_providers_edit: true,
      ai_providers_execute: true,
    },
  },
  {
    _id: 'viewer',
    name: 'Viewer',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true,
      tools_view: true, resources_view: true, prompts_view: true,
      users_view: true, roles_view: true,
      audit_view: true,
      observability_view: true,
      error_tracking_view: true,
      ai_providers_view: true,
    },
  },
]

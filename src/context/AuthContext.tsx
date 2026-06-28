import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api'
import { READ_ONLY_FALLBACK, ROLE_PERMISSION_FALLBACKS } from './permissionPresets'

export enum Permission {
  ServersView = 'servers_view',
  ServersCreate = 'servers_create',
  ServersEditSettings = 'servers_edit_settings',
  ServersDelete = 'servers_delete',
  ServersToggleActive = 'servers_toggle_active',
  ServersShare = 'servers_share',
  ToolsView = 'tools_view',
  ToolsCreate = 'tools_create',
  ToolsEdit = 'tools_edit',
  ToolsDelete = 'tools_delete',
  ToolsTest = 'tools_test',
  EndpointsCreate = 'endpoints_create',
  ResourcesView = 'resources_view',
  ResourcesCreate = 'resources_create',
  ResourcesEdit = 'resources_edit',
  ResourcesDelete = 'resources_delete',
  PromptsView = 'prompts_view',
  PromptsCreate = 'prompts_create',
  PromptsEdit = 'prompts_edit',
  PromptsDelete = 'prompts_delete',
  SecretsViewNames = 'secrets_view_names',
  SecretsRevealValues = 'secrets_reveal_values',
  SecretsCreate = 'secrets_create',
  SecretsEdit = 'secrets_edit',
  SecretsDelete = 'secrets_delete',
  ApiKeysView = 'api_keys_view',
  ApiKeysCreate = 'api_keys_create',
  ApiKeysDelete = 'api_keys_delete',
  UsersView = 'users_view',
  UsersInvite = 'users_invite',
  UsersEdit = 'users_edit',
  UsersDelete = 'users_delete',
  RolesView = 'roles_view',
  RolesManage = 'roles_manage',
  AuditView = 'audit_view',
  AuditExport = 'audit_export',
  TemplatesUse = 'templates_use',
  SettingsManage = 'settings_manage',
  AiProvidersView = 'ai_providers_view',
  AiProvidersCreate = 'ai_providers_create',
  AiProvidersEdit = 'ai_providers_edit',
  AiProvidersDelete = 'ai_providers_delete',
  ObservabilityView = 'observability_view',
  ObservabilityCreate = 'observability_create',
  ObservabilityEdit = 'observability_edit',
  ObservabilityDelete = 'observability_delete',
  ErrorTrackingView = 'error_tracking_view',
  ErrorTrackingCreate = 'error_tracking_create',
  ErrorTrackingEdit = 'error_tracking_edit',
  ErrorTrackingDelete = 'error_tracking_delete',
}

export interface UserPermissions {
  servers_view: boolean
  servers_create: boolean
  servers_edit_settings: boolean
  servers_delete: boolean
  servers_toggle_active: boolean
  servers_share: boolean
  tools_view: boolean
  tools_create: boolean
  tools_edit: boolean
  tools_delete: boolean
  tools_test: boolean
  endpoints_create: boolean
  resources_view: boolean
  resources_create: boolean
  resources_edit: boolean
  resources_delete: boolean
  prompts_view: boolean
  prompts_create: boolean
  prompts_edit: boolean
  prompts_delete: boolean
  secrets_view_names: boolean
  secrets_reveal_values: boolean
  secrets_create: boolean
  secrets_edit: boolean
  secrets_delete: boolean
  api_keys_view: boolean
  api_keys_create: boolean
  api_keys_delete: boolean
  users_view: boolean
  users_invite: boolean
  users_edit: boolean
  users_delete: boolean
  roles_view: boolean
  roles_manage: boolean
  audit_view: boolean
  audit_export: boolean
  templates_use: boolean
  settings_manage: boolean
  ai_providers_view: boolean
  ai_providers_create: boolean
  ai_providers_edit: boolean
  ai_providers_delete: boolean
  observability_view: boolean
  observability_create: boolean
  observability_edit: boolean
  observability_delete: boolean
  error_tracking_view: boolean
  error_tracking_create: boolean
  error_tracking_edit: boolean
  error_tracking_delete: boolean
}

export interface Me {
  _id: string
  username: string
  email: string
  role: string
  createdAt: string
  permissions?: UserPermissions
}

// Fallback permissions derived from role string when backend doesn't return them yet
function permissionsFromRole(role: string): UserPermissions {
  const fallback = ROLE_PERMISSION_FALLBACKS[role]
  if (fallback) return fallback
  // Unknown custom role not found in DB: read-only fallback
  return READ_ONLY_FALLBACK
}

interface AuthContextType {
  me: Me | null
  loading: boolean
  can: (key: keyof UserPermissions) => boolean
  isAdmin: boolean
  reload: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  me: null,
  loading: true,
  can: () => false,
  isAdmin: false,
  reload: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function can(me: Me | null, key: keyof UserPermissions): boolean {
  if (!me) return false
  if (me.role === 'admin') return true
  const perms = me.permissions ?? permissionsFromRole(me.role)
  return perms[key] ?? false
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    setLoading(true)
    api.get<Me>('/users/me')
      .then((r) => setMe(r.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const canFn = useCallback(
    (key: keyof UserPermissions) => can(me, key),
    [me],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setMe(null)
    setLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ me, loading, can: canFn, isAdmin: me?.role === 'admin', reload: load, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

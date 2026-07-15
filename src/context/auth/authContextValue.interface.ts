import type { Me } from './me.interface'
import type { UserPermissions } from './userPermissions.interface'

export interface AuthContextValue {
  me: Me | null
  loading: boolean
  can: (key: keyof UserPermissions) => boolean
  isAdmin: boolean
  /** True only for self-hosted deployments — the Administration section (Settings, Error Tracking) is editable there. */
  selfHosted: boolean
  reload: () => void
  logout: () => void
}

import { ALL_PERMISSIONS_OFF } from './allPermissionsOff.constant'
import type { UserPermissions } from './userPermissions.interface'

export const READ_ONLY_FALLBACK: UserPermissions = {
  ...ALL_PERMISSIONS_OFF,
  servers_view: true,
  tools_view: true,
  resources_view: true,
  prompts_view: true,
}

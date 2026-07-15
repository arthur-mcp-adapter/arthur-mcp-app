import type { RolePermissions } from '../rolePermissions.interface'
import { ALL_OFF } from '../constants/allOff.constant'

export const emptyPermissions = (): RolePermissions => ({ ...ALL_OFF, servers_view: true })

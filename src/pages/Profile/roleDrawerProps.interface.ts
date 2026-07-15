import type { Role } from './role.interface'

export interface RoleDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: (role: Role) => void
  editRole?: Role
}

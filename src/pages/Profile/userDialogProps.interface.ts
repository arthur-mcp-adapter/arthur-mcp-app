import type { UserProfile } from './userProfile.interface'

// ─── User dialog ──────────────────────────────────────────────────────────────

export interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (user: UserProfile) => void
  editUser?: UserProfile
  onDeleted?: (id: string) => void
  canDelete?: boolean
  currentUserId?: string
}

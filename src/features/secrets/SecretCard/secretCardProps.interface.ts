import type { Secret } from '../types'

export interface SecretCardProps {
  secret: Secret
  onEdit: (secret: Secret) => void
  onDelete: (secret: Secret) => void
  onCopy: (secret: Secret) => Promise<void>
  copied: boolean
}

import type { SecretEntry } from './secretEntry.interface'

export interface SecretAutocompleteProps {
  value: string
  onChange: (v: string) => void
  label: string
  secrets: SecretEntry[]
  loadingSecrets: boolean
  disabled?: boolean
}

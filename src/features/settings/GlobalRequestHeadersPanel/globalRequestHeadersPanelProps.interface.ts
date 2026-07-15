import type { HeaderEntry } from './headerEntry.interface'

export interface GlobalRequestHeadersPanelProps {
  globalHeaders: HeaderEntry[]
  onAdd: () => void
  onRemove: (id: string) => void
  onChange: (id: string, field: 'name' | 'value', value: string) => void
}

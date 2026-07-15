import type { HeaderEntry } from '../../types'

export function emptyHeader(): HeaderEntry {
  return { id: Math.random().toString(36).slice(2), name: '', value: '' }
}

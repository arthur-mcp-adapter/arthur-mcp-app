import type { SourceType } from '../sourceType.type'

export function isBlankSource(st: SourceType): boolean {
  return st === 'blank'
}

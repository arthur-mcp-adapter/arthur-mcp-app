import type { SourceType } from '../sourceType.type'
import { SQL_SOURCES } from './sqlSources.constant'

export function isSqlSource(st: SourceType): boolean {
  return SQL_SOURCES.includes(st)
}

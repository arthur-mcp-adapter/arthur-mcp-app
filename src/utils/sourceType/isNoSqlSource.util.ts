import type { SourceType } from '../sourceType.type'
import { NOSQL_SOURCES } from './noSqlSources.constant'

export function isNoSqlSource(st: SourceType): boolean {
  return NOSQL_SOURCES.includes(st)
}

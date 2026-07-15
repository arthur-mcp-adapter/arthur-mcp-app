import type { SourceType } from '../sourceType.type'
import { SQL_SOURCES } from './sqlSources.constant'
import { NOSQL_SOURCES } from './noSqlSources.constant'

export function isDbSource(st: SourceType): boolean {
  return SQL_SOURCES.includes(st) || NOSQL_SOURCES.includes(st)
}

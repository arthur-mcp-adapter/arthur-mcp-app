import type { DbSourceType } from './dbSourceType.type'
import type { NoSqlSourceType } from './noSqlSourceType.type'
import type { ApiSourceType } from './apiSourceType.type'

export type SourceType = DbSourceType | NoSqlSourceType | ApiSourceType | 'blank'

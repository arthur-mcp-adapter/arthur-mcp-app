import type { SourceType } from '../sourceType.type'

export const DB_DATABASE_LABEL: Partial<Record<SourceType, string>> = {
  cassandra:  'Keyspace',
  clickhouse: 'Database',
}

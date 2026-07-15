import type { SourceType } from '../sourceType.type'

export const DB_DATABASE_PLACEHOLDER: Partial<Record<SourceType, string>> = {
  cassandra:  'my_keyspace',
  clickhouse: 'default',
  oracle:     'ORCL',
}

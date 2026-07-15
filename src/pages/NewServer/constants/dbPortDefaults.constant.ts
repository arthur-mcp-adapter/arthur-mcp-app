import type { SourceType } from '../sourceType.type'

export // ─── Step definitions (dynamic per source type) ───────────────────────────────

const DB_PORT_DEFAULTS: Partial<Record<SourceType, string>> = {
  postgresql:    '5432',
  mysql:         '3306',
  mariadb:       '3306',
  mssql:         '1433',
  oracle:        '1521',
  cockroachdb:   '26257',
  clickhouse:    '8443',
  cassandra:     '9042',
  redis:         '6379',
  elasticsearch: '9200',
}

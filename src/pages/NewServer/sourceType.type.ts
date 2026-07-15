// ─── Source types ─────────────────────────────────────────────────────────────

export type SourceType =
  | 'blank'
  | 'rest' | 'graphql' | 'grpc'
  | 'postgresql' | 'mysql' | 'mariadb' | 'mssql' | 'oracle' | 'cockroachdb'
  | 'mongodb' | 'redis' | 'cassandra' | 'dynamodb' | 'elasticsearch' | 'snowflake' | 'clickhouse' | 'firestore'

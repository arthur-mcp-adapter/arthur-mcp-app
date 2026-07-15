import type { SourceType } from '../sourceType.type'

export const SOURCE_DISPLAY: Record<SourceType, { label: string; emoji: string; color: string }> = {
  blank:         { label: 'Blank / Static',  emoji: '📄', color: '#9E9E9E' },
  rest:          { label: 'REST API',        emoji: '🌐', color: '#5D87FF' },
  graphql:       { label: 'GraphQL',         emoji: '🔮', color: '#E535AB' },
  grpc:          { label: 'gRPC',            emoji: '⚡', color: '#fca130' },
  postgresql:    { label: 'PostgreSQL',      emoji: '🐘', color: '#336791' },
  mysql:         { label: 'MySQL',           emoji: '🐬', color: '#4479A1' },
  mariadb:       { label: 'MariaDB',         emoji: '🦭', color: '#003545' },
  mssql:         { label: 'SQL Server',      emoji: '🏢', color: '#CC2927' },
  oracle:        { label: 'Oracle DB',       emoji: '🏛️', color: '#F80000' },
  cockroachdb:   { label: 'CockroachDB',     emoji: '🪳', color: '#6933FF' },
  clickhouse:    { label: 'ClickHouse',      emoji: '🖱️', color: '#FAFF00' },
  mongodb:       { label: 'MongoDB',         emoji: '🍃', color: '#47A248' },
  redis:         { label: 'Redis',           emoji: '🔴', color: '#DC382D' },
  cassandra:     { label: 'Cassandra',       emoji: '👁️', color: '#1287B1' },
  dynamodb:      { label: 'DynamoDB',        emoji: '🔷', color: '#232F3E' },
  elasticsearch: { label: 'Elasticsearch',  emoji: '🔍', color: '#FEC514' },
  snowflake:     { label: 'Snowflake',       emoji: '❄️', color: '#29B5E8' },
  firestore:     { label: 'Firestore',       emoji: '🔥', color: '#FFCA28' },
}

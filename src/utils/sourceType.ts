import { API_TEMPLATES } from '../data/api-templates'

export type DbSourceType = 'postgresql'|'mysql'|'mariadb'|'mssql'|'oracle'|'cockroachdb'|'clickhouse'|'cassandra'|'snowflake'
export type NoSqlSourceType = 'mongodb'|'redis'|'dynamodb'|'elasticsearch'|'firestore'
export type ApiSourceType = 'rest'|'graphql'|'grpc'
export type SourceType = DbSourceType | NoSqlSourceType | ApiSourceType | 'blank'

export const SQL_SOURCES: SourceType[] = ['postgresql','mysql','mariadb','mssql','oracle','cockroachdb','clickhouse','cassandra','snowflake']
export const NOSQL_SOURCES: SourceType[] = ['mongodb','redis','dynamodb','elasticsearch','firestore']
export const API_SOURCES: SourceType[] = ['rest','graphql','grpc']

export function getSourceType(project: { tags?: string[] }): SourceType {
  const tag = (project.tags ?? []).find(t => t.startsWith('source:'))
  return (tag?.slice(7) as SourceType) ?? 'rest'
}

export function isDbSource(st: SourceType): boolean {
  return SQL_SOURCES.includes(st) || NOSQL_SOURCES.includes(st)
}

export function isSqlSource(st: SourceType): boolean {
  return SQL_SOURCES.includes(st)
}

export function isNoSqlSource(st: SourceType): boolean {
  return NOSQL_SOURCES.includes(st)
}

export function isBlankSource(st: SourceType): boolean {
  return st === 'blank'
}

/** Uses the matching template's own icon/color when the project was created from one (`template:<name>` tag), falling back to the generic source-type icon otherwise. */
export function getProjectIcon(project: { tags?: string[] }): { label: string; emoji: string; color: string } {
  const templateTag = (project.tags ?? []).find(t => t.startsWith('template:'))
  const templateName = templateTag?.slice('template:'.length)
  const template = templateName ? API_TEMPLATES.find(t => t.name === templateName) : undefined
  if (template) return { label: template.name, emoji: template.emoji, color: template.color }
  return SOURCE_DISPLAY[getSourceType(project)]
}

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

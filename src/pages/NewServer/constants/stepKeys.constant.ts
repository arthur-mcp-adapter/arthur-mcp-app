import type { SourceType } from '../sourceType.type'

export const STEP_KEYS: Record<SourceType, string[]> = {
  blank:         ['source', 'details'],
  rest:          ['source', 'details', 'importSpec', 'toolsOverview', 'authentication'],
  graphql:       ['source', 'details', 'schema',     'authentication'],
  grpc:          ['source', 'details', 'connection',  'authentication'],
  postgresql:    ['source', 'details', 'connection'],
  mysql:         ['source', 'details', 'connection'],
  mariadb:       ['source', 'details', 'connection'],
  mssql:         ['source', 'details', 'connection'],
  oracle:        ['source', 'details', 'connection'],
  cockroachdb:   ['source', 'details', 'connection'],
  clickhouse:    ['source', 'details', 'connection'],
  mongodb:       ['source', 'details', 'connection'],
  redis:         ['source', 'details', 'connection'],
  cassandra:     ['source', 'details', 'connection'],
  firestore:     ['source', 'details', 'connection'],
  dynamodb:      ['source', 'details', 'connection'],
  elasticsearch: ['source', 'details', 'connection'],
  snowflake:     ['source', 'details', 'connection'],
}

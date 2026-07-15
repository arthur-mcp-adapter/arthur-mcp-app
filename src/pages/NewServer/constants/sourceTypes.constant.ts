import type { SourceType } from '../sourceType.type'

export const SOURCE_TYPES: Array<{
  id: SourceType
  name: string
  description: string
  emoji: string
  color: string
  available: boolean
  group: string
}> = [
  // ── Blank ─────────────────────────────────────────────────────────────────
  { id: 'blank',   name: 'Blank / Static', description: 'No external connection. Define tools that return hardcoded or parameter-based responses.', emoji: '📄', color: '#9E9E9E', available: true, group: 'Other' },
  // ── APIs ──────────────────────────────────────────────────────────────────
  { id: 'rest',    name: 'REST API',  description: 'HTTP APIs described with OpenAPI, Swagger, or Postman collections.', emoji: '🌐', color: '#5D87FF', available: true,  group: 'API' },
  { id: 'graphql', name: 'GraphQL',   description: 'Expose queries and mutations from a GraphQL endpoint as MCP tools.', emoji: '🔮', color: '#E535AB', available: false, group: 'API' },
  { id: 'grpc',    name: 'gRPC',      description: 'High-performance RPC services using Protocol Buffer definitions.',    emoji: '⚡', color: '#fca130', available: false, group: 'API' },
  // ── Relational databases ──────────────────────────────────────────────────
  { id: 'postgresql',  name: 'PostgreSQL',   description: 'Open-source object-relational database system.',                        emoji: '🐘', color: '#336791', available: false, group: 'SQL' },
  { id: 'mysql',       name: 'MySQL',        description: 'The world\'s most popular open-source relational database.',             emoji: '🐬', color: '#4479A1', available: false, group: 'SQL' },
  { id: 'mariadb',     name: 'MariaDB',      description: 'MySQL-compatible community-driven relational database.',                 emoji: '🦭', color: '#003545', available: false, group: 'SQL' },
  { id: 'mssql',       name: 'SQL Server',   description: 'Microsoft\'s enterprise relational database management system.',        emoji: '🏢', color: '#CC2927', available: false, group: 'SQL' },
  { id: 'oracle',      name: 'Oracle DB',    description: 'Oracle\'s enterprise-grade relational database.',                       emoji: '🏛️', color: '#F80000', available: false, group: 'SQL' },
  { id: 'cockroachdb', name: 'CockroachDB',  description: 'Distributed SQL database with PostgreSQL compatibility.',               emoji: '🪳', color: '#6933FF', available: false, group: 'SQL' },
  { id: 'clickhouse',  name: 'ClickHouse',   description: 'Column-oriented database for real-time analytics at scale.',            emoji: '🖱️', color: '#FAFF00', available: false, group: 'SQL' },
  // ── NoSQL / Document / Key-value ─────────────────────────────────────────
  { id: 'mongodb',       name: 'MongoDB',       description: 'Document-oriented NoSQL database with flexible schema.',              emoji: '🍃', color: '#47A248', available: false, group: 'NoSQL' },
  { id: 'redis',         name: 'Redis',          description: 'In-memory key-value store for caching, queues, and pub/sub.',        emoji: '🔴', color: '#DC382D', available: false, group: 'NoSQL' },
  { id: 'cassandra',     name: 'Cassandra',      description: 'Wide-column store for high availability and massive datasets.',       emoji: '👁️', color: '#1287B1', available: false, group: 'NoSQL' },
  { id: 'firestore',     name: 'Firestore',      description: 'Google\'s serverless document database for web and mobile apps.',    emoji: '🔥', color: '#FFCA28', available: false, group: 'NoSQL' },
  // ── Cloud / Warehouse ────────────────────────────────────────────────────
  { id: 'dynamodb',      name: 'DynamoDB',       description: 'AWS fully managed key-value and document database service.',         emoji: '🔷', color: '#232F3E', available: false, group: 'Cloud' },
  { id: 'elasticsearch', name: 'Elasticsearch',  description: 'Distributed search and analytics engine built on Apache Lucene.',    emoji: '🔍', color: '#FEC514', available: false, group: 'Cloud' },
  { id: 'snowflake',     name: 'Snowflake',      description: 'Cloud data warehouse with multi-cluster shared data architecture.',  emoji: '❄️', color: '#29B5E8', available: false, group: 'Cloud' },
]

import type { DbConnectionConfig, DbQuery, ExecutionRef } from '../types';
import { executeSql } from './sql.adapter';
import { executeMongodb } from './mongodb.adapter';
import { executeRedis } from './redis.adapter';

/**
 * Execute a DbQuery (the reusable data-source definition) with given args.
 * This is the primary execution path for non-HTTP integrations.
 */
export async function executeDbQuery(
  query: DbQuery,
  args: Record<string, unknown>,
  connectionConfig: DbConnectionConfig | Record<string, unknown> | undefined,
): Promise<unknown> {
  const cfg = (connectionConfig ?? {}) as DbConnectionConfig;
  const { sourceType } = query;

  // SQL family
  if (['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'cockroachdb', 'clickhouse', 'cassandra', 'snowflake'].includes(sourceType)) {
    const sqlRef: any = {
      type: 'sql',
      dialect: sourceType,
      query: query.query ?? '',
      paramStyle: 'named',
      resultMode: query.resultMode ?? 'rows',
    };
    return executeSql(sqlRef, args, cfg);
  }

  // MongoDB / Firestore
  if (sourceType === 'mongodb' || sourceType === 'firestore') {
    const mongoRef: any = {
      type: 'mongodb',
      collection: query.collection ?? '',
      operation: query.operationType ?? 'find',
      filterTemplate: query.filterTemplate ? JSON.parse(query.filterTemplate) : undefined,
      projectionTemplate: query.projectionTemplate ? JSON.parse(query.projectionTemplate) : undefined,
      pipeline: query.pipeline ? JSON.parse(query.pipeline) : undefined,
      documentTemplate: query.updateTemplate ? JSON.parse(query.updateTemplate) : undefined,
    };
    return executeMongodb(mongoRef, args, cfg);
  }

  // Redis
  if (sourceType === 'redis') {
    const redisRef: any = {
      type: 'redis',
      command: query.command ?? 'GET',
      keyPattern: query.keyPattern ?? '',
      valueTemplate: query.valueTemplate,
      redisTemplate: query.redisTemplate ?? 'exact_key',
      valuePattern: query.valuePattern,
      keyPrefixFilter: query.keyPrefixFilter,
      redisMinScore: query.redisMinScore,
      redisMaxScore: query.redisMaxScore,
      redisLimit: query.redisLimit,
      redisFtIndex: query.redisFtIndex,
      redisFetchValues: query.redisFetchValues,
    };
    return executeRedis(redisRef, args, cfg);
  }

  // GraphQL
  if (sourceType === 'graphql') {
    throw new Error('GraphQL adapter not yet available.');
  }

  // gRPC
  if (sourceType === 'grpc') {
    throw new Error('gRPC adapter not yet available.');
  }

  // DynamoDB, Elasticsearch, Snowflake (SQL path above handles snowflake)
  throw new Error(`Adapter not yet available for source type: ${sourceType}`);
}

/** Execute any ExecutionRef with the given args and connection config. Returns raw result. */
export async function executeWithRef(
  ref: ExecutionRef,
  args: Record<string, unknown>,
  connectionConfig: DbConnectionConfig | Record<string, unknown> | undefined,
): Promise<unknown> {
  const cfg = (connectionConfig ?? {}) as DbConnectionConfig;

  switch (ref.type) {
    case 'sql':
      return executeSql(ref, args, cfg);

    case 'mongodb':
    case 'firestore':
      return executeMongodb(ref as any, args, cfg);

    case 'redis':
      return executeRedis(ref, args, cfg);

    case 'dynamodb':
      throw new Error('DynamoDB adapter not yet available. Contribute at github.com/your-org/mcp-convert.');

    case 'elasticsearch':
      throw new Error('Elasticsearch adapter not yet available.');

    case 'snowflake':
      throw new Error('Snowflake adapter not yet available.');

    case 'graphql':
      throw new Error('GraphQL adapter not yet available.');

    case 'grpc':
      throw new Error('gRPC adapter not yet available.');

    case 'http':
    default:
      throw new Error(`Use the HTTP pipeline for executionRef.type='http'. Received: ${(ref as any).type}`);
  }
}

/** Test whether a connection config is reachable. Returns { ok, latencyMs } or throws. */
export async function testConnection(
  sourceType: string,
  cfg: DbConnectionConfig,
): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Date.now();
  switch (sourceType) {
    case 'postgresql':
    case 'cockroachdb': {
      let pg: any;
      try { pg = require('pg'); } catch { throw new Error('pg not installed'); }
      const client = new pg.Client({ host: cfg.host, port: cfg.port ?? 5432, database: cfg.database, user: cfg.user, password: cfg.password, ssl: cfg.ssl ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 5000 });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      break;
    }
    case 'mysql':
    case 'mariadb': {
      let mysql2: any;
      try { mysql2 = require('mysql2/promise'); } catch { throw new Error('mysql2 not installed'); }
      const conn = await mysql2.createConnection({ host: cfg.host, port: cfg.port ?? 3306, database: cfg.database, user: cfg.user, password: cfg.password, connectTimeout: 5000 });
      await conn.execute('SELECT 1');
      await conn.end();
      break;
    }
    case 'mongodb': {
      let mongodb: any;
      try { mongodb = require('mongodb'); } catch { throw new Error('mongodb not installed'); }
      const uri = cfg.uri ?? `mongodb://${cfg.host ?? 'localhost'}:${cfg.port ?? 27017}`;
      const client = new mongodb.MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      break;
    }
    case 'redis': {
      let Redis: any;
      try { Redis = require('ioredis'); } catch { throw new Error('ioredis not installed'); }
      const client = new Redis({ host: cfg.redisHost ?? cfg.host ?? 'localhost', port: cfg.redisPort ?? cfg.port ?? 6379, password: cfg.redisPassword ?? cfg.password, lazyConnect: true, connectTimeout: 5000 });
      await client.connect();
      await client.ping();
      client.disconnect();
      break;
    }
    default:
      throw new Error(`Connection test not yet supported for source type: ${sourceType}`);
  }
  return { ok: true, latencyMs: Date.now() - t0 };
}

/** Introspect schema — list tables/collections/indices */
export async function introspectSchema(
  sourceType: string,
  cfg: DbConnectionConfig,
): Promise<{ tables?: Array<{ name: string; columns: Array<{ name: string; type: string; nullable: boolean }> }>; collections?: string[] }> {
  const { introspectSql } = await import('./sql.adapter');
  const { introspectMongodb } = await import('./mongodb.adapter');

  if (['postgresql', 'mysql', 'mariadb', 'mssql', 'cockroachdb'].includes(sourceType)) {
    return introspectSql(cfg, sourceType);
  }
  if (sourceType === 'mongodb') {
    return introspectMongodb(cfg);
  }
  throw new Error(`Introspection not yet supported for source type: ${sourceType}`);
}

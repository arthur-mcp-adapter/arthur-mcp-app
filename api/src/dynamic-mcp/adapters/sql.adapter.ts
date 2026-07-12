import type { DbConnectionConfig, ExecutionRef } from '../types';

type SqlExecRef = Extract<ExecutionRef, { type: 'sql' }>;

// ─── Parameter interpolation ──────────────────────────────────────────────────

function buildQuery(query: string, args: Record<string, unknown>, paramStyle: 'named' | 'positional'): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  if (paramStyle === 'positional') {
    const text = query.replace(/:(\w+)/g, (_, name) => {
      values.push(args[name] ?? null);
      return `$${values.length}`;
    });
    return { text, values };
  }
  // named: for mysql/mariadb/mssql style
  const params: Record<string, unknown> = {};
  const names: string[] = [];
  const text = query.replace(/:(\w+)/g, (_, name) => {
    if (!names.includes(name)) names.push(name);
    params[name] = args[name] ?? null;
    return `:${name}`;
  });
  return { text, values: names.map((n) => params[n]) };
}

export function buildQuestionMarkQuery(query: string, args: Record<string, unknown>): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const text = query.replace(/:(\w+)/g, (_, name: string) => {
    values.push(args[name] ?? null);
    return '?';
  });
  return { text, values };
}

// ─── PostgreSQL / CockroachDB ─────────────────────────────────────────────────

async function executePostgres(ref: SqlExecRef, args: Record<string, unknown>, cfg: DbConnectionConfig): Promise<unknown> {
  let pg: any;
  try { pg = require('pg'); } catch { throw new Error('PostgreSQL driver not installed. Run: npm install pg'); }
  const client = new pg.Client({
    host: cfg.host, port: cfg.port ?? 5432, database: cfg.database,
    user: cfg.user, password: cfg.password, ssl: cfg.ssl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    const { text, values } = buildQuery(ref.query, args, 'positional');
    const res = await client.query(text, values);
    if (ref.resultMode === 'count') return res.rowCount ?? res.rows.length;
    if (ref.resultMode === 'first') return res.rows[0] ?? null;
    return res.rows;
  } finally { await client.end(); }
}

// ─── MySQL / MariaDB ──────────────────────────────────────────────────────────

async function executeMysql(ref: SqlExecRef, args: Record<string, unknown>, cfg: DbConnectionConfig): Promise<unknown> {
  let mysql2: any;
  try { mysql2 = require('mysql2/promise'); } catch { throw new Error('MySQL driver not installed. Run: npm install mysql2'); }
  const conn = await mysql2.createConnection({
    host: cfg.host, port: cfg.port ?? 3306, database: cfg.database,
    user: cfg.user, password: cfg.password, ssl: cfg.ssl ? {} : undefined,
  });
  try {
    const { text, values } = buildQuestionMarkQuery(ref.query, args);
    const [rows] = await conn.execute(text, values);
    if (ref.resultMode === 'count') return Array.isArray(rows) ? rows.length : 0;
    if (ref.resultMode === 'first') return Array.isArray(rows) ? rows[0] ?? null : null;
    return rows;
  } finally { await conn.end(); }
}

// ─── SQL Server ───────────────────────────────────────────────────────────────

async function executeMssql(ref: SqlExecRef, args: Record<string, unknown>, cfg: DbConnectionConfig): Promise<unknown> {
  let mssql: any;
  try { mssql = require('mssql'); } catch { throw new Error('SQL Server driver not installed. Run: npm install mssql'); }
  const pool = await mssql.connect({
    server: cfg.host ?? 'localhost', port: cfg.port ?? 1433, database: cfg.database,
    user: cfg.user, password: cfg.password, options: { encrypt: cfg.ssl ?? false, trustServerCertificate: true },
  });
  try {
    const request = pool.request();
    const text = ref.query.replace(/:(\w+)/g, (_, name: string) => {
      request.input(name, args[name] ?? null);
      return `@${name}`;
    });
    const res = await request.query(text);
    const rows = res.recordset ?? [];
    if (ref.resultMode === 'count') return rows.length;
    if (ref.resultMode === 'first') return rows[0] ?? null;
    return rows;
  } finally { await pool.close(); }
}

// ─── ClickHouse ───────────────────────────────────────────────────────────────

async function executeClickhouse(ref: SqlExecRef, args: Record<string, unknown>, cfg: DbConnectionConfig): Promise<unknown> {
  let ch: any;
  try { ch = require('@clickhouse/client'); } catch { throw new Error('ClickHouse client not installed. Run: npm install @clickhouse/client'); }
  const client = ch.createClient({
    host: `${cfg.ssl ? 'https' : 'http'}://${cfg.host ?? 'localhost'}:${cfg.port ?? 8443}`,
    username: cfg.user, password: cfg.password, database: cfg.database,
  });
  try {
    const { text, values } = buildQuery(ref.query, args, 'positional');
    const paramObj: Record<string, string> = {};
    values.forEach((v, i) => { paramObj[`param_p${i + 1}`] = String(v ?? ''); });
    const resultSet = await client.query({ query: text.replace(/\$(\d+)/g, (_, n) => `{p${n}:String}`), query_params: paramObj, format: 'JSONEachRow' });
    const rows = await resultSet.json();
    if (ref.resultMode === 'count') return rows.length;
    if (ref.resultMode === 'first') return rows[0] ?? null;
    return rows;
  } finally { await client.close(); }
}

// ─── Cassandra ────────────────────────────────────────────────────────────────

async function executeCassandra(ref: SqlExecRef, args: Record<string, unknown>, cfg: DbConnectionConfig): Promise<unknown> {
  let cassandra: any;
  try { cassandra = require('cassandra-driver'); } catch { throw new Error('Cassandra driver not installed. Run: npm install cassandra-driver'); }
  const client = new cassandra.Client({
    contactPoints: [cfg.host ?? 'localhost'],
    localDataCenter: 'datacenter1',
    keyspace: cfg.database,
    credentials: cfg.user ? { username: cfg.user, password: cfg.password } : undefined,
  });
  await client.connect();
  try {
    const { text, values } = buildQuestionMarkQuery(ref.query, args);
    const res = await client.execute(text, values, { prepare: true });
    const rows = res.rows ?? [];
    if (ref.resultMode === 'count') return rows.length;
    if (ref.resultMode === 'first') return rows[0] ? rows[0].toJSON() : null;
    return rows.map((r: any) => r.toJSON());
  } finally { await client.shutdown(); }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function executeSql(
  ref: SqlExecRef,
  args: Record<string, unknown>,
  cfg: DbConnectionConfig,
): Promise<unknown> {
  switch (ref.dialect) {
    case 'postgresql':
    case 'cockroachdb': return executePostgres(ref, args, cfg);
    case 'mysql':
    case 'mariadb':    return executeMysql(ref, args, cfg);
    case 'mssql':      return executeMssql(ref, args, cfg);
    case 'clickhouse': return executeClickhouse(ref, args, cfg);
    case 'cassandra':  return executeCassandra(ref, args, cfg);
    case 'oracle':     throw new Error('Oracle adapter not yet available. Install oracledb and contribute the adapter.');
    case 'snowflake':  throw new Error('Use the snowflake executionRef type for Snowflake queries.');
    default:           throw new Error(`Unknown SQL dialect: ${(ref as any).dialect}`);
  }
}

/** Introspect schema: list tables with column info */
export async function introspectSql(cfg: DbConnectionConfig, dialect: string): Promise<{ tables: Array<{ name: string; columns: Array<{ name: string; type: string; nullable: boolean }> }> }> {
  switch (dialect) {
    case 'postgresql':
    case 'cockroachdb': {
      let pg: any;
      try { pg = require('pg'); } catch { throw new Error('pg not installed'); }
      const client = new pg.Client({ host: cfg.host, port: cfg.port ?? 5432, database: cfg.database, user: cfg.user, password: cfg.password, ssl: cfg.ssl ? { rejectUnauthorized: false } : false });
      await client.connect();
      try {
        const res = await client.query(`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
        const map = new Map<string, Array<{ name: string; type: string; nullable: boolean }>>();
        for (const row of res.rows) {
          if (!map.has(row.table_name)) map.set(row.table_name, []);
          map.get(row.table_name)!.push({ name: row.column_name, type: row.data_type, nullable: row.is_nullable === 'YES' });
        }
        return { tables: [...map.entries()].map(([name, columns]) => ({ name, columns })) };
      } finally { await client.end(); }
    }
    case 'mysql':
    case 'mariadb': {
      let mysql2: any;
      try { mysql2 = require('mysql2/promise'); } catch { throw new Error('mysql2 not installed'); }
      const conn = await mysql2.createConnection({ host: cfg.host, port: cfg.port ?? 3306, database: cfg.database, user: cfg.user, password: cfg.password });
      try {
        const [rows] = await conn.execute('SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION');
        const map = new Map<string, any[]>();
        for (const row of rows as any[]) {
          if (!map.has(row.TABLE_NAME)) map.set(row.TABLE_NAME, []);
          map.get(row.TABLE_NAME)!.push({ name: row.COLUMN_NAME, type: row.DATA_TYPE, nullable: row.IS_NULLABLE === 'YES' });
        }
        return { tables: [...map.entries()].map(([name, columns]) => ({ name, columns })) };
      } finally { await conn.end(); }
    }
    default:
      throw new Error(`Introspection not yet supported for dialect: ${dialect}`);
  }
}

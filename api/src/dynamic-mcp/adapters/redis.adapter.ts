import type { DbConnectionConfig, ExecutionRef } from '../types';

type RedisRef = Extract<ExecutionRef, { type: 'redis' }>;

function interpolate(template: string, args: Record<string, unknown>): string {
  return template.replace(/{{(\w+)}}/g, (_, k) => String(args[k] ?? ''));
}

export async function executeRedis(
  ref: RedisRef,
  args: Record<string, unknown>,
  cfg: DbConnectionConfig,
): Promise<unknown> {
  let Redis: any;
  try { Redis = require('ioredis'); } catch { throw new Error('Redis client not installed. Run: npm install ioredis'); }

  const client = new Redis({
    host: cfg.redisHost ?? cfg.host ?? 'localhost',
    port: cfg.redisPort ?? cfg.port ?? 6379,
    password: cfg.redisPassword ?? cfg.password,
    tls: cfg.redisTls ? {} : undefined,
    lazyConnect: true,
  });
  await client.connect();

  try {
    const tpl = ref.redisTemplate ?? 'exact_key';

    // ── Exact key lookup ────────────────────────────────────────────────────
    if (tpl === 'exact_key') {
      return client.get(interpolate(ref.keyPattern ?? '', args));
    }

    // ── Key prefix scan ─────────────────────────────────────────────────────
    if (tpl === 'key_prefix') {
      const prefix = interpolate(ref.keyPattern ?? '*', args);
      const pattern = prefix.includes('*') ? prefix : prefix + '*';
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [next, batch]: [string, string[]] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        keys.push(...batch);
        if (ref.redisLimit && keys.length >= ref.redisLimit) break;
      } while (cursor !== '0');
      const limited = ref.redisLimit ? keys.slice(0, ref.redisLimit) : keys;
      if (!ref.redisFetchValues) return limited;
      return Promise.all(limited.map(async (k) => ({ key: k, value: await client.get(k) })));
    }

    // ── Key range (sorted set ZRANGEBYSCORE) ────────────────────────────────
    if (tpl === 'key_range') {
      const key = interpolate(ref.keyPattern ?? '', args);
      const min = ref.redisMinScore ? interpolate(ref.redisMinScore, args) : '-inf';
      const max = ref.redisMaxScore ? interpolate(ref.redisMaxScore, args) : '+inf';
      if (ref.redisLimit) {
        return client.zrangebyscore(key, min, max, 'WITHSCORES', 'LIMIT', 0, ref.redisLimit);
      }
      return client.zrangebyscore(key, min, max, 'WITHSCORES');
    }

    // ── Search by value ─────────────────────────────────────────────────────
    if (tpl === 'search_by_value') {
      const keyPattern = ref.keyPrefixFilter ? interpolate(ref.keyPrefixFilter, args) : '*';
      const needle = ref.valuePattern ? interpolate(ref.valuePattern, args) : '';
      const results: Array<{ key: string; value: string }> = [];
      let cursor = '0';
      do {
        const [next, keys]: [string, string[]] = await client.scan(cursor, 'MATCH', keyPattern, 'COUNT', 100);
        cursor = next;
        for (const k of keys) {
          const val = await client.get(k);
          if (val !== null && (needle === '' || val.includes(needle))) {
            results.push({ key: k, value: val });
            if (ref.redisLimit && results.length >= ref.redisLimit) break;
          }
        }
        if (ref.redisLimit && results.length >= ref.redisLimit) break;
      } while (cursor !== '0');
      return results;
    }

    // ── Secondary index (SMEMBERS → optionally GET each member) ────────────
    if (tpl === 'secondary_index') {
      const indexKey = interpolate(ref.keyPattern ?? '', args);
      const members: string[] = await client.smembers(indexKey);
      if (!ref.redisFetchValues) return members;
      return Promise.all(members.map(async (k) => ({ key: k, value: await client.get(k) })));
    }

    // ── Full-text search (RediSearch FT.SEARCH) ─────────────────────────────
    if (tpl === 'full_text') {
      const index = ref.redisFtIndex ?? 'idx';
      const query = interpolate(ref.keyPattern ?? '*', args);
      const limit = ref.redisLimit ?? 10;
      return client.call('FT.SEARCH', index, query, 'LIMIT', 0, limit);
    }

    // ── Composite / custom command ───────────────────────────────────────────
    const key = interpolate(ref.keyPattern ?? '', args);
    const cmd = (ref.command ?? 'GET').toUpperCase();

    switch (cmd) {
      case 'GET':    return client.get(key);
      case 'SET':    return client.set(key, interpolate(ref.valueTemplate ?? '{{value}}', args));
      case 'DEL':    return client.del(key);
      case 'EXISTS': return client.exists(key);
      case 'TTL':    return client.ttl(key);
      case 'EXPIRE': return client.expire(key, Number(args.seconds ?? 60));
      case 'KEYS':   return client.keys(key);
      case 'HGET':   return client.hget(key, String(args.field ?? ''));
      case 'HSET':   return client.hset(key, String(args.field ?? ''), String(args.value ?? ''));
      case 'HGETALL':return client.hgetall(key);
      case 'HDEL':   return client.hdel(key, String(args.field ?? ''));
      case 'LPUSH':  return client.lpush(key, interpolate(ref.valueTemplate ?? '{{value}}', args));
      case 'RPUSH':  return client.rpush(key, interpolate(ref.valueTemplate ?? '{{value}}', args));
      case 'LPOP':   return client.lpop(key);
      case 'RPOP':   return client.rpop(key);
      case 'LRANGE': return client.lrange(key, Number(args.start ?? 0), Number(args.stop ?? -1));
      case 'SADD':   return client.sadd(key, interpolate(ref.valueTemplate ?? '{{value}}', args));
      case 'SMEMBERS': return client.smembers(key);
      case 'SREM':   return client.srem(key, String(args.member ?? ''));
      default:       throw new Error(`Unsupported Redis command: ${cmd}`);
    }
  } finally { client.disconnect(); }
}

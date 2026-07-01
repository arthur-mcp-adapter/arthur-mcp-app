import type { DbConnectionConfig, ExecutionRef } from '../types';

type MongoRef = Extract<ExecutionRef, { type: 'mongodb' }>;

function interpolateTemplate(template: unknown, args: Record<string, unknown>): unknown {
  if (!template) return template;
  const str = JSON.stringify(template);
  const result = str.replace(/"{{(\w+)}}"/g, (_, key) => JSON.stringify(args[key] ?? null));
  return JSON.parse(result);
}

export async function executeMongodb(
  ref: MongoRef,
  args: Record<string, unknown>,
  cfg: DbConnectionConfig,
): Promise<unknown> {
  let mongodb: any;
  try { mongodb = require('mongodb'); } catch { throw new Error('MongoDB driver not installed. Run: npm install mongodb'); }

  const uri = cfg.uri ?? `mongodb://${cfg.user ? `${cfg.user}:${cfg.password}@` : ''}${cfg.host ?? 'localhost'}:${cfg.port ?? 27017}/${cfg.database}`;
  const client = new mongodb.MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(cfg.database);
    const coll = db.collection(ref.collection);

    switch (ref.operation) {
      case 'find': {
        const filter = interpolateTemplate(ref.filterTemplate ?? {}, args);
        const projection = ref.projectionTemplate ? interpolateTemplate(ref.projectionTemplate, args) : undefined;
        const cursor = coll.find(filter as any, projection ? { projection: projection as any } : {});
        return cursor.toArray();
      }
      case 'insertOne': {
        const doc = interpolateTemplate(ref.documentTemplate ?? args, args);
        const res = await coll.insertOne(doc as any);
        return { insertedId: res.insertedId };
      }
      case 'updateOne': {
        const filter = interpolateTemplate(ref.filterTemplate ?? {}, args);
        const update = interpolateTemplate(ref.documentTemplate ?? { $set: args }, args);
        const res = await coll.updateOne(filter as any, update as any);
        return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
      }
      case 'deleteOne': {
        const filter = interpolateTemplate(ref.filterTemplate ?? {}, args);
        const res = await coll.deleteOne(filter as any);
        return { deletedCount: res.deletedCount };
      }
      case 'aggregate': {
        const pipeline = (ref.pipeline ?? []).map((stage) => interpolateTemplate(stage, args));
        return coll.aggregate(pipeline as any[]).toArray();
      }
      default:
        throw new Error(`Unknown MongoDB operation: ${ref.operation}`);
    }
  } finally { await client.close(); }
}

export async function introspectMongodb(cfg: DbConnectionConfig): Promise<{ collections: string[] }> {
  let mongodb: any;
  try { mongodb = require('mongodb'); } catch { throw new Error('MongoDB driver not installed. Run: npm install mongodb'); }
  const uri = cfg.uri ?? `mongodb://${cfg.host ?? 'localhost'}:${cfg.port ?? 27017}`;
  const client = new mongodb.MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(cfg.database);
    const collections = await db.listCollections().toArray();
    return { collections: collections.map((c: any) => c.name) };
  } finally { await client.close(); }
}

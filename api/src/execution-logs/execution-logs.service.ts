import { Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';

const TTL_7_DAYS = 7 * 24 * 60 * 60;

export interface LogEntry {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  source: 'mcp' | 'direct';
  statusCode: number;
  responseTimeMs: number;
  isError: boolean;
  errorMessage?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  createdAt: Date;
}

export interface LogExecutionDto {
  serverId: string;
  serverName: string;
  toolName: string;
  source?: 'mcp' | 'direct';
  statusCode?: number;
  responseTimeMs?: number;
  isError?: boolean;
  errorMessage?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

@Injectable()
export class ExecutionLogsService {
  private readonly cache = new NodeCache({ stdTTL: TTL_7_DAYS, useClones: false });

  log(dto: LogExecutionDto): void {
    const id = crypto.randomUUID();
    const entry: LogEntry = {
      id,
      serverId: dto.serverId,
      serverName: dto.serverName,
      toolName: dto.toolName,
      source: dto.source ?? 'mcp',
      statusCode: dto.statusCode ?? 200,
      responseTimeMs: dto.responseTimeMs ?? 0,
      isError: dto.isError ?? false,
      errorMessage: dto.errorMessage,
      requestPayload: dto.requestPayload,
      responsePayload: dto.responsePayload,
      createdAt: new Date(),
    };
    this.cache.set(`${dto.serverId}:${id}`, entry);
  }

  private allEntries(): LogEntry[] {
    const map = this.cache.mget<LogEntry>(this.cache.keys());
    return Object.values(map).filter((v): v is LogEntry => !!v);
  }

  private projectEntries(serverId: string): LogEntry[] {
    const prefix = `${serverId}:`;
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    const map = this.cache.mget<LogEntry>(keys);
    return Object.values(map)
      .filter((v): v is LogEntry => !!v)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByProject(serverId: string, limit = 100, skip = 0): Promise<LogEntry[]> {
    return this.projectEntries(serverId).slice(skip, skip + limit);
  }

  async countByProject(serverId: string): Promise<number> {
    return this.projectEntries(serverId).length;
  }

  async getStats(since?: Date): Promise<{
    total: number;
    errors: number;
    avgResponseMs: number;
    byTool: { toolName: string; count: number; errors: number }[];
  }> {
    const logs = since
      ? this.allEntries().filter((e) => e.createdAt >= since)
      : this.allEntries();

    const total = logs.length;
    const errors = logs.filter((e) => e.isError).length;
    const avgResponseMs =
      total > 0 ? Math.round(logs.reduce((s, e) => s + e.responseTimeMs, 0) / total) : 0;

    const toolMap = new Map<string, { count: number; errors: number }>();
    for (const e of logs) {
      const t = toolMap.get(e.toolName) ?? { count: 0, errors: 0 };
      t.count++;
      if (e.isError) t.errors++;
      toolMap.set(e.toolName, t);
    }

    const byTool = [...toolMap.entries()]
      .map(([toolName, s]) => ({ toolName, ...s }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { total, errors, avgResponseMs, byTool };
  }

  getInRange(from: Date, to: Date): LogEntry[] {
    return this.allEntries().filter((e) => e.createdAt >= from && e.createdAt <= to);
  }

  async getProjectStats(serverId: string, since?: Date): Promise<{
    total: number; errors: number; avgResponseMs: number;
    byTool: { toolName: string; count: number; errors: number }[];
  }> {
    let logs = this.projectEntries(serverId);
    if (since) logs = logs.filter((e) => e.createdAt >= since);
    const total = logs.length;
    const errors = logs.filter((e) => e.isError).length;
    const avgResponseMs = total > 0 ? Math.round(logs.reduce((s, e) => s + e.responseTimeMs, 0) / total) : 0;
    const toolMap = new Map<string, { count: number; errors: number }>();
    for (const e of logs) {
      const t = toolMap.get(e.toolName) ?? { count: 0, errors: 0 };
      t.count++; if (e.isError) t.errors++;
      toolMap.set(e.toolName, t);
    }
    const byTool = [...toolMap.entries()].map(([toolName, s]) => ({ toolName, ...s })).sort((a, b) => b.count - a.count);
    return { total, errors, avgResponseMs, byTool };
  }

  /** Health summary for all projects: error rate in last hour */
  getHealthSummary(projectIds: string[]): Map<string, { errorRatePct: number; totalCalls: number; lastCallAt?: Date }> {
    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const result = new Map<string, { errorRatePct: number; totalCalls: number; lastCallAt?: Date }>();
    for (const id of projectIds) {
      const logs = this.projectEntries(id).filter(e => e.createdAt >= since1h);
      const total = logs.length;
      const errors = logs.filter(e => e.isError).length;
      const lastCallAt = logs[0]?.createdAt;
      result.set(id, { totalCalls: total, errorRatePct: total > 0 ? Math.round((errors / total) * 100) : -1, lastCallAt });
    }
    return result;
  }

  deleteByProject(serverId: string): void {
    const prefix = `${serverId}:`;
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    if (keys.length) this.cache.del(keys);
  }
}

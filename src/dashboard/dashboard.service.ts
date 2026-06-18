import { Inject, Injectable } from '@nestjs/common';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';
import { ExecutionLogsService } from '../execution-logs/execution-logs.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
    private readonly executionLogs: ExecutionLogsService,
  ) {}

  async getStats(from: Date, to: Date) {
    const logs = this.executionLogs.getInRange(from, to);
    const bucketType = this.bucketType(from, to);

    const callsInPeriod = logs.length;
    const errorsInPeriod = logs.filter((e) => e.isError).length;

    const toolMap = new Map<string, { count: number; projectName: string }>();
    for (const e of logs) {
      const t = toolMap.get(e.toolName) ?? { count: 0, projectName: e.projectName };
      t.count++;
      toolMap.set(e.toolName, t);
    }
    const topTools = [...toolMap.entries()]
      .map(([toolName, v]) => ({ toolName, count: v.count, projectName: v.projectName }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const bucketMap = new Map<string, { calls: number; errors: number }>();
    for (const e of logs) {
      const key = this.formatBucket(e.createdAt, bucketType);
      const b = bucketMap.get(key) ?? { calls: 0, errors: 0 };
      b.calls++;
      if (e.isError) b.errors++;
      bucketMap.set(key, b);
    }
    const callsByBucket = [...bucketMap.entries()]
      .map(([_id, v]) => ({ _id, ...v }))
      .sort((a, b) => a._id.localeCompare(b._id));

    const allProjects = await this.projectRepo.findAll();
    const totalProjects = allProjects.length;
    const projectsWithKey = allProjects.filter(
      (p) => p.mcpApiKey || (p.mcpApiKeys?.length ?? 0) > 0,
    ).length;
    const totalTools = allProjects.reduce((s, p) => s + (p.tools?.length ?? 0), 0);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      projects: {
        total: totalProjects,
        withApiKey: projectsWithKey,
        active: allProjects.filter((p) => p.status === 'active').length,
      },
      tools: { total: totalTools },
      calls: {
        total: callsInPeriod,
        errors: errorsInPeriod,
        successRate:
          callsInPeriod > 0
            ? Math.round(((callsInPeriod - errorsInPeriod) / callsInPeriod) * 100)
            : 100,
      },
      topTools,
      callsByBucket,
      recentProjects: allProjects.slice(0, 5).map((p) => ({
        _id: p._id,
        name: p.name,
        toolCount: p.tools?.length ?? 0,
        status: p.status,
        tags: p.tags ?? [],
      })),
    };
  }

  private bucketType(from: Date, to: Date): 'hour' | 'day' | 'week' {
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 2) return 'hour';
    if (diffDays < 31) return 'day';
    return 'week';
  }

  private formatBucket(date: Date, type: 'hour' | 'day' | 'week'): string {
    if (type === 'hour') return date.toISOString().slice(0, 13) + ':00';
    if (type === 'day') return date.toISOString().slice(0, 10);
    return this.isoWeek(date);
  }

  private isoWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  async getHealthSummary(): Promise<
    { projectId: string; projectName: string; isPaused: boolean; errorRatePct: number; totalCalls: number; lastCallAt?: Date }[]
  > {
    const projects = await this.projectRepo.findAll();
    const ids = projects.map((p) => p._id);
    const healthMap = this.executionLogs.getHealthSummary(ids);

    return projects.map((p) => {
      const h = healthMap.get(p._id);
      return {
        projectId: p._id,
        projectName: p.name,
        isPaused: p.isPaused ?? false,
        errorRatePct: h?.errorRatePct ?? -1,
        totalCalls: h?.totalCalls ?? 0,
        lastCallAt: h?.lastCallAt,
      };
    });
  }
}

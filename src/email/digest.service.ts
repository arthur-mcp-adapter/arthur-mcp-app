import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { EmailService } from './email.service';
import { ExecutionLogsService } from '../execution-logs/execution-logs.service';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly email: EmailService,
    private readonly logs: ExecutionLogsService,
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  /** Runs every Monday at 8 AM UTC */
  @Cron('0 8 * * 1')
  async sendWeeklyDigests() {
    if (!this.email.isConfigured) return;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allProjects = await this.projectRepo.findAll();
    const projects = allProjects.filter((p) => p.alertConfig?.notifyEmail);

    for (const project of projects) {
      const email = project.alertConfig?.notifyEmail;
      if (!email) continue;

      try {
        const projectStats = await this.logs.getProjectStats(project._id, since);

        const from = since.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const to = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        await this.email.send({
          to: email,
          subject: `Weekly summary — ${project.name}`,
          html: this.email.buildWeeklyDigest({
            projectName: project.name,
            totalCalls: projectStats.total,
            errors: projectStats.errors,
            successRate:
              projectStats.total > 0
                ? Math.round(((projectStats.total - projectStats.errors) / projectStats.total) * 100)
                : 100,
            topTools: projectStats.byTool.slice(0, 5).map((t) => ({ name: t.toolName, count: t.count })),
            periodLabel: `${from} – ${to}`,
          }),
        });
      } catch (err: any) {
        this.logger.error(`Failed weekly digest for project ${project.name}: ${err?.message}`);
      }
    }
  }

  /** Called after each tool execution to check if alert should fire */
  async checkAlertThreshold(projectId: string, projectName: string): Promise<void> {
    if (!this.email.isConfigured) return;

    const project = await this.projectRepo.findById(projectId);
    if (!project?.alertConfig?.enabled || !project.alertConfig.notifyEmail) return;

    const since15m = new Date(Date.now() - 15 * 60 * 1000);
    const stats = await this.logs.getProjectStats(projectId, since15m);
    if (stats.total < 5) return;

    const errorPct = Math.round((stats.errors / stats.total) * 100);
    if (errorPct < project.alertConfig.errorThresholdPct) return;

    const key = `alert:${projectId}`;
    if ((this as any)[key] && Date.now() - (this as any)[key] < 30 * 60 * 1000) return;
    (this as any)[key] = Date.now();

    const recentErrors = stats.byTool
      .filter((t) => t.errors > 0)
      .slice(0, 5)
      .map((t) => ({ toolName: t.toolName, message: 'Error', time: new Date().toLocaleTimeString() }));

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    await this.email.send({
      to: project.alertConfig.notifyEmail,
      subject: `⚠️ Alert — ${projectName} error rate ${errorPct}%`,
      html: this.email.buildAlertEmail({
        projectName,
        errorRate: errorPct,
        threshold: project.alertConfig.errorThresholdPct,
        recentErrors,
        projectUrl: `${appUrl}/projects/${projectId}`,
      }),
    });
  }
}

import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nowInTz(timezone: string): { hour: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
      timeZone: timezone,
    }).formatToParts(new Date());
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[parts.find((p) => p.type === 'weekday')?.value ?? ''] ?? new Date().getUTCDay();
    return { hour, day };
  } catch {
    return { hour: new Date().getUTCHours(), day: new Date().getUTCDay() };
  }
}

@Injectable()
export class ProjectStateGuard implements CanActivate {
  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const serverId = req.params['serverId'];

    const server = await this.projectRepo.findByIdOrShareSlug(serverId);
    if (!server) return true;

    if (server.isPaused) {
      res.status(503).json({
        error: 'Project paused',
        message: `The server "${server.name}" is temporarily paused by its manager. Please try again later.`,
      });
      return false;
    }

    if (server.maintenanceMode?.enabled) {
      const msg =
        server.maintenanceMode.message?.trim() ||
        `The server "${server.name}" is under maintenance. Please try again later.`;
      res.status(503).json({ error: 'Maintenance mode', message: msg });
      return false;
    }

    if (server.availabilityWindow?.enabled) {
      const { timezone, schedule } = server.availabilityWindow;
      const tz = timezone ?? 'UTC';
      const { hour, day } = nowInTz(tz);
      const entries = Array.isArray(schedule) ? schedule : [];

      const allowed = entries.some((e) => e.day === day && hour >= e.startHour && hour < e.endHour);

      if (!allowed) {
        const summary =
          entries.length === 0
            ? 'No availability windows configured.'
            : entries.map((e) => `${DAY_NAMES[e.day]} ${e.startHour}:00–${e.endHour}:00`).join(', ');
        res.status(503).json({
          error: 'Outside availability window',
          message: `This server is not available right now (${DAY_NAMES[day]} ${hour}:xx ${tz}). Allowed: ${summary}.`,
        });
        return false;
      }
    }

    return true;
  }
}

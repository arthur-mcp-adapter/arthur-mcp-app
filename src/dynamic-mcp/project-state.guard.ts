import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request, Response } from 'express';
import { SwaggerProject, SwaggerProjectDocument } from '../swagger/swagger-project.schema';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nowInTz(timezone: string): { hour: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', hour12: false,
      weekday: 'short',
      timeZone: timezone,
    }).formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[parts.find(p => p.type === 'weekday')?.value ?? ''] ?? new Date().getUTCDay();
    return { hour, day };
  } catch {
    return { hour: new Date().getUTCHours(), day: new Date().getUTCDay() };
  }
}

@Injectable()
export class ProjectStateGuard implements CanActivate {
  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const projectId = req.params['projectId'];

    const project = await this.projectModel
      .findById(projectId)
      .select('isPaused maintenanceMode availabilityWindow name')
      .exec();

    if (!project) return true;

    if (project.isPaused) {
      res.status(503).json({
        error: 'Project paused',
        message: `The project "${project.name}" is temporarily paused by its manager. Please try again later.`,
      });
      return false;
    }

    if (project.maintenanceMode?.enabled) {
      const msg = project.maintenanceMode.message?.trim()
        || `The project "${project.name}" is under maintenance. Please try again later.`;
      res.status(503).json({ error: 'Maintenance mode', message: msg });
      return false;
    }

    if (project.availabilityWindow?.enabled) {
      const { timezone, schedule } = project.availabilityWindow;
      const tz = timezone ?? 'UTC';
      const { hour, day } = nowInTz(tz);
      const entries = Array.isArray(schedule) ? schedule : [];

      const allowed = entries.some(e =>
        e.day === day && hour >= e.startHour && hour < e.endHour
      );

      if (!allowed) {
        const summary = entries.length === 0
          ? 'No availability windows configured.'
          : entries
              .map(e => `${DAY_NAMES[e.day]} ${e.startHour}:00–${e.endHour}:00`)
              .join(', ');
        res.status(503).json({
          error: 'Outside availability window',
          message: `This project is not available right now (${DAY_NAMES[day]} ${hour}:xx ${tz}). Allowed: ${summary}.`,
        });
        return false;
      }
    }

    return true;
  }
}

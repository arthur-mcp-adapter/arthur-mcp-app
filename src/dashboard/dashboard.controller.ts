import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * GET /dashboard/stats?from=<ISO>&to=<ISO>
   * Default: last 24h when not provided.
   */
  @Get('stats')
  getStats(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dates. Use ISO 8601 format.');
    }
    if (from >= to) {
      throw new BadRequestException('"from" deve ser anterior a "to".');
    }

    return this.dashboard.getStats(from, to);
  }

  @Get('health-summary')
  getHealthSummary() {
    return this.dashboard.getHealthSummary();
  }
}

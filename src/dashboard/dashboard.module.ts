import { Module } from '@nestjs/common';
import { ExecutionLogsModule } from '../execution-logs/execution-logs.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [ExecutionLogsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

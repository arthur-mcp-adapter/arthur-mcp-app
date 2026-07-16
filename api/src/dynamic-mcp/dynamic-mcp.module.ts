import { Module } from '@nestjs/common';
import { DynamicMcpController } from './dynamic-mcp.controller';
import { DynamicMcpService } from './dynamic-mcp.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { ProjectStateGuard } from './project-state.guard';
import { ExecutionLogsModule } from '../execution-logs/execution-logs.module';
import { ErrorTrackingModule } from '../error-tracking/error-tracking.module';
import { SettingsModule } from '../settings/settings.module';
import { OAuthModule } from '../oauth/oauth.module';

@Module({
  imports: [ExecutionLogsModule, ErrorTrackingModule, SettingsModule, OAuthModule],
  controllers: [DynamicMcpController],
  providers: [DynamicMcpService, McpApiKeyGuard, RateLimitGuard, ProjectStateGuard],
  exports: [DynamicMcpService],
})
export class DynamicMcpModule {}

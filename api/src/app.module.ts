import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SwaggerModule } from './swagger/swagger.module';
import { DynamicMcpModule } from './dynamic-mcp/dynamic-mcp.module';
import { ObservabilityModule } from './observability/observability.module';
import { McpExceptionFilter } from './common/filters/mcp-exception.filter';
import { ExecutionLogsModule } from './execution-logs/execution-logs.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ShareModule } from './share/share.module';
import { EmailFeaturesModule } from './email/email-features.module';
import { OAuthModule } from './oauth/oauth.module';
import { PromptsModule } from './prompts/prompts.module';
import { SecretsModule } from './secrets/secrets.module';
import { RolesModule } from './roles/roles.module';
import { ErrorTrackingModule } from './error-tracking/error-tracking.module';
import { AiProvidersModule } from './ai-providers/ai-providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule.forRoot(),
    ObservabilityModule,
    AuthModule,
    SwaggerModule,
    DynamicMcpModule,
    ExecutionLogsModule,
    AuditLogsModule,
    SettingsModule,
    DashboardModule,
    ShareModule,
    EmailFeaturesModule,
    OAuthModule,
    PromptsModule,
    SecretsModule,
    RolesModule,
    ErrorTrackingModule,
    AiProvidersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: McpExceptionFilter },
  ],
})
export class AppModule {}

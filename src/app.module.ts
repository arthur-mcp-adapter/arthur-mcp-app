import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SwaggerModule } from './swagger/swagger.module';
import { DynamicMcpModule } from './dynamic-mcp/dynamic-mcp.module';
import { LoggingModule } from './logging/logging.module';
import { HealthModule } from './health/health.module';
import { McpLoggingInterceptor } from './logging/mcp-logging.interceptor';
import { McpExceptionFilter } from './common/filters/mcp-exception.filter';
import { ExecutionLogsModule } from './execution-logs/execution-logs.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ShareModule } from './share/share.module';
import { EmailFeaturesModule } from './email/email-features.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule.forRoot(),
    AuthModule,
    SwaggerModule,
    DynamicMcpModule,
    LoggingModule,
    HealthModule,
    ExecutionLogsModule,
    AuditLogsModule,
    SettingsModule,
    DashboardModule,
    ShareModule,
    EmailFeaturesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: McpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: McpLoggingInterceptor,
    },
  ],
})
export class AppModule {}

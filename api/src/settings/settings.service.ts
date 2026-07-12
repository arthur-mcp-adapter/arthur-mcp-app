import { Injectable } from '@nestjs/common';
import { config } from '../config/configuration';

export interface SettingsSnapshot {
  appUrl: string;
  jwtSecretConfigured: boolean;
  globalRequestHeaders: { name: string; value: string }[];
  smtp: {
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
    from?: string;
  };
  /** Actual running values for the observability env vars shown on the Observability page. */
  observabilityEnvironment: Record<string, string>;
}

/** Read-only snapshot of operator-level config, sourced entirely from environment variables. */
@Injectable()
export class SettingsService {
  getSnapshot(): SettingsSnapshot {
    return {
      appUrl: config.appUrl,
      jwtSecretConfigured: config.jwtSecret !== 'change-me-in-production-secret',
      globalRequestHeaders: config.globalRequestHeaders,
      smtp: {
        configured: !!(config.smtpHost && config.smtpUser),
        host: config.smtpHost,
        port: config.smtpPort,
        user: config.smtpUser,
        from: config.smtpFrom,
      },
      observabilityEnvironment: {
        ENABLE_METRICS: process.env.ENABLE_METRICS ?? 'true',
        SERVICE_NAME: process.env.SERVICE_NAME ?? 'arthur-mcp-adapter',
        SERVICE_VERSION: process.env.SERVICE_VERSION ?? '1.0.0',
        PROMETHEUS_METRICS_PATH: process.env.PROMETHEUS_METRICS_PATH ?? '/metrics',
      },
    };
  }
}

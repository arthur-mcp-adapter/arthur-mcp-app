import { MigrationInterface, QueryRunner } from 'typeorm';

const renamesByTable: Record<string, [string, string][]> = {
  users: [
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  swagger_projects: [
    ['baseUrl', 'base_url'],
    ['shareSlug', 'share_slug'],
    ['rawSpec', 'raw_spec'],
    ['errorMessage', 'error_message'],
    ['mcpApiKey', 'mcp_api_key'],
    ['mcpApiKeys', 'mcp_api_keys'],
    ['oauthClientId', 'oauth_client_id'],
    ['oauthClientSecret', 'oauth_client_secret'],
    ['rateLimit', 'rate_limit'],
    ['isPaused', 'is_paused'],
    ['maintenanceMode', 'maintenance_mode'],
    ['availabilityWindow', 'availability_window'],
    ['alertConfig', 'alert_config'],
    ['tenantConfig', 'tenant_config'],
    ['responseConfig', 'response_config'],
    ['connectionConfig', 'connection_config'],
    ['dbQueries', 'db_queries'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  settings: [
    ['serverBaseUrl', 'server_base_url'],
    ['defaultTimeoutMs', 'default_timeout_ms'],
    ['smtpHost', 'smtp_host'],
    ['smtpPort', 'smtp_port'],
    ['smtpUser', 'smtp_user'],
    ['smtpPass', 'smtp_pass'],
    ['smtpFrom', 'smtp_from'],
    ['jwtSecret', 'jwt_secret'],
    ['globalRequestHeaders', 'global_request_headers'],
    ['observabilityEnvironment', 'observability_environment'],
  ],
  password_resets: [
    ['userId', 'user_id'],
    ['expiresAt', 'expires_at'],
    ['createdAt', 'created_at'],
  ],
  prompts: [
    ['tagsJson', 'tags_json'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  secrets: [
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  roles: [
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  error_tracking_providers: [
    ['projectName', 'project_name'],
    ['isActive', 'is_active'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  ai_providers: [
    ['apiKey', 'api_key'],
    ['baseUrl', 'base_url'],
    ['isActive', 'is_active'],
    ['isDefault', 'is_default'],
    ['lastTestStatus', 'last_test_status'],
    ['lastTestedAt', 'last_tested_at'],
    ['lastTestError', 'last_test_error'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
};

async function renameIfNeeded(queryRunner: QueryRunner, table: string, from: string, to: string): Promise<void> {
  if (!(await queryRunner.hasTable(table))) return;
  if (await queryRunner.hasColumn(table, to)) return;
  if (!(await queryRunner.hasColumn(table, from))) return;
  await queryRunner.renameColumn(table, from, to);
}

export class RenameCamelCaseColumnsToSnakeCase1700000000001 implements MigrationInterface {
  name = 'RenameCamelCaseColumnsToSnakeCase1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, renames] of Object.entries(renamesByTable)) {
      for (const [from, to] of renames) {
        await renameIfNeeded(queryRunner, table, from, to);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, renames] of Object.entries(renamesByTable)) {
      for (const [from, to] of [...renames].reverse()) {
        await renameIfNeeded(queryRunner, table, to, from);
      }
    }
  }
}

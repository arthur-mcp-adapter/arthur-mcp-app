import { MigrationInterface, QueryRunner, Table } from 'typeorm';

type ColumnType = ConstructorParameters<typeof Table>[0]['columns'][number];

function isPostgres(queryRunner: QueryRunner): boolean {
  return queryRunner.connection.options.type === 'postgres';
}

function isMysql(queryRunner: QueryRunner): boolean {
  return queryRunner.connection.options.type === 'mysql';
}

function idColumn(queryRunner: QueryRunner): ColumnType {
  if (isPostgres(queryRunner)) {
    return {
      name: 'id',
      type: 'uuid',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'uuid',
      default: 'uuid_generate_v4()',
    };
  }

  return {
    name: 'id',
    type: 'varchar',
    length: '36',
    isPrimary: true,
  };
}

function timestampColumn(queryRunner: QueryRunner, name: string, update = false, options: Partial<ColumnType> = {}): ColumnType {
  if (isPostgres(queryRunner)) {
    return { name, type: 'timestamp', default: 'now()', ...options };
  }

  if (isMysql(queryRunner)) {
    return {
      name,
      type: 'datetime',
      default: 'CURRENT_TIMESTAMP',
      onUpdate: update ? 'CURRENT_TIMESTAMP' : undefined,
      ...options,
    };
  }

  return { name, type: 'datetime', default: "datetime('now')", ...options };
}

function varcharColumn(name: string, options: Partial<ColumnType> = {}): ColumnType {
  return { name, type: 'varchar', ...options };
}

function textColumn(name: string, options: Partial<ColumnType> = {}): ColumnType {
  return { name, type: 'text', ...options };
}

function booleanColumn(name: string, defaultValue: boolean): ColumnType {
  return { name, type: 'boolean', default: defaultValue };
}

function integerColumn(name: string, defaultValue: number): ColumnType {
  return { name, type: 'int', default: defaultValue };
}

async function createTableIfMissing(queryRunner: QueryRunner, table: Table): Promise<void> {
  if (!(await queryRunner.hasTable(table.name))) {
    await queryRunner.createTable(table, true);
  }
}

export class InitialTypeormSchema1700000000000 implements MigrationInterface {
  name = 'InitialTypeormSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isPostgres(queryRunner)) {
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    }

    await createTableIfMissing(queryRunner, new Table({
      name: 'users',
      columns: [
        idColumn(queryRunner),
        varcharColumn('username', { isUnique: true }),
        varcharColumn('email', { isUnique: true }),
        varcharColumn('password'),
        varcharColumn('role', { default: "'user'" }),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'swagger_projects',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name'),
        varcharColumn('baseUrl'),
        varcharColumn('description', { isNullable: true }),
        varcharColumn('version', { isNullable: true }),
        varcharColumn('shareSlug', { isNullable: true, isUnique: true }),
        textColumn('rawSpec', { isNullable: true }),
        textColumn('tools', { default: "'[]'" }),
        textColumn('auth', { default: '\'{"type":"none"}\'' }),
        varcharColumn('status', { default: "'active'" }),
        varcharColumn('errorMessage', { isNullable: true }),
        varcharColumn('mcpApiKey', { isNullable: true }),
        textColumn('mcpApiKeys', { default: "'[]'" }),
        textColumn('resources', { default: "'[]'" }),
        textColumn('prompts', { default: "'[]'" }),
        textColumn('chains', { default: "'[]'" }),
        varcharColumn('oauthClientId', { isNullable: true }),
        varcharColumn('oauthClientSecret', { isNullable: true }),
        textColumn('tags', { default: "'[]'" }),
        textColumn('rateLimit', { default: '\'{"enabled":false,"requestsPerMinute":60}\'' }),
        booleanColumn('isPaused', false),
        textColumn('maintenanceMode', { default: '\'{"enabled":false,"message":""}\'' }),
        textColumn('availabilityWindow', { default: '\'{"enabled":false,"timezone":"UTC","schedule":[]}\'' }),
        textColumn('alertConfig', { default: '\'{"enabled":false,"errorThresholdPct":20,"notifyEmail":""}\'' }),
        textColumn('tenantConfig', { default: '\'{"enabled":false,"params":[]}\'' }),
        textColumn('responseConfig', { default: '\'{"enabled":false}\'' }),
        textColumn('connectionConfig', { isNullable: true }),
        textColumn('dbQueries', { default: "'[]'" }),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'settings',
      columns: [
        idColumn(queryRunner),
        varcharColumn('key', { isUnique: true, default: "'global'" }),
        varcharColumn('serverBaseUrl', { default: "''" }),
        integerColumn('defaultTimeoutMs', 30000),
        varcharColumn('smtpHost', { default: "''" }),
        integerColumn('smtpPort', 587),
        varcharColumn('smtpUser', { default: "''" }),
        varcharColumn('smtpPass', { default: "''" }),
        varcharColumn('smtpFrom', { default: "''" }),
        varcharColumn('jwtSecret', { default: "''" }),
        textColumn('globalRequestHeaders', { isNullable: true }),
        textColumn('observabilityEnvironment', { isNullable: true }),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'password_resets',
      columns: [
        idColumn(queryRunner),
        varcharColumn('userId'),
        varcharColumn('token', { isUnique: true }),
        timestampColumn(queryRunner, 'expiresAt'),
        booleanColumn('used', false),
        timestampColumn(queryRunner, 'createdAt'),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'prompts',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name'),
        varcharColumn('description', { isNullable: true }),
        textColumn('content'),
        textColumn('tagsJson', { default: "'[]'" }),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'secrets',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name', { isUnique: true }),
        textColumn('value'),
        varcharColumn('description', { isNullable: true }),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'roles',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name', { isUnique: true }),
        varcharColumn('description', { isNullable: true }),
        textColumn('permissions'),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'error_tracking_providers',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name'),
        varcharColumn('description', { isNullable: true }),
        varcharColumn('tool'),
        textColumn('dsn'),
        varcharColumn('projectName', { isNullable: true }),
        varcharColumn('environment', { isNullable: true }),
        booleanColumn('isActive', false),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));

    await createTableIfMissing(queryRunner, new Table({
      name: 'ai_providers',
      columns: [
        idColumn(queryRunner),
        varcharColumn('name'),
        varcharColumn('description', { isNullable: true }),
        varcharColumn('provider'),
        varcharColumn('model'),
        textColumn('apiKey'),
        varcharColumn('baseUrl', { isNullable: true }),
        booleanColumn('isActive', true),
        booleanColumn('isDefault', false),
        varcharColumn('lastTestStatus', { isNullable: true }),
        timestampColumn(queryRunner, 'lastTestedAt', false, { isNullable: true }),
        varcharColumn('lastTestError', { isNullable: true }),
        timestampColumn(queryRunner, 'createdAt'),
        timestampColumn(queryRunner, 'updatedAt', true),
      ],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'ai_providers',
      'error_tracking_providers',
      'roles',
      'secrets',
      'prompts',
      'password_resets',
      'settings',
      'swagger_projects',
      'users',
    ]) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.dropTable(table, true);
      }
    }
  }
}

import { MigrationInterface, QueryRunner, Table, TableColumnOptions } from 'typeorm';

// Settings moved from a DB-backed table (editable via UI) to environment-variable-only
// configuration — a single shared "admin settings" concept doesn't fit a workspace-per-tenant model.
export class DropSettingsTable1700000003000 implements MigrationInterface {
  name = 'DropSettingsTable1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('settings')) {
      await queryRunner.dropTable('settings');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('settings')) return;

    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const idColumn: TableColumnOptions = isPostgres
      ? { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' }
      : { name: 'id', type: 'varchar', length: '36', isPrimary: true };

    await queryRunner.createTable(new Table({
      name: 'settings',
      columns: [
        idColumn,
        { name: 'key', type: 'varchar', isUnique: true, default: "'global'" },
        { name: 'server_base_url', type: 'varchar', default: "''" },
        { name: 'default_timeout_ms', type: 'int', default: 30000 },
        { name: 'smtp_host', type: 'varchar', default: "''" },
        { name: 'smtp_port', type: 'int', default: 587 },
        { name: 'smtp_user', type: 'varchar', default: "''" },
        { name: 'smtp_pass', type: 'varchar', default: "''" },
        { name: 'smtp_from', type: 'varchar', default: "''" },
        { name: 'jwt_secret', type: 'varchar', default: "''" },
        { name: 'global_request_headers', type: 'text', isNullable: true },
        { name: 'observability_environment', type: 'text', isNullable: true },
      ],
    }), true);
  }
}

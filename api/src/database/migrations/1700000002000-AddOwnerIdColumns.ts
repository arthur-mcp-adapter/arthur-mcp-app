import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableUnique } from 'typeorm';

const OWNED_TABLES = ['swagger_projects', 'prompts', 'secrets', 'ai_providers'];
const SECRETS_OWNER_NAME_INDEX = 'UQ_secrets_owner_id_name';

async function addColumnIfMissing(queryRunner: QueryRunner, table: string, column: TableColumn): Promise<void> {
  if (!(await queryRunner.hasColumn(table, column.name))) {
    await queryRunner.addColumn(table, column);
  }
}

export class AddOwnerIdColumns1700000002000 implements MigrationInterface {
  name = 'AddOwnerIdColumns1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of OWNED_TABLES) {
      await addColumnIfMissing(
        queryRunner,
        table,
        new TableColumn({ name: 'owner_id', type: 'varchar', isNullable: true }),
      );
    }

    // secrets.name was globally unique — must become unique per (owner_id, name).
    // The original constraint was created via CONSTRAINT ... UNIQUE(name), which TypeORM
    // tracks as a Table-level unique (table.uniques), not TableColumn.isUnique.
    const secretsTable = await queryRunner.getTable('secrets');
    const nameUnique = secretsTable?.uniques.find(
      (u) => u.columnNames.length === 1 && u.columnNames[0] === 'name',
    );
    if (nameUnique) {
      await queryRunner.dropUniqueConstraint('secrets', nameUnique);
    }

    const refreshedSecretsTable = await queryRunner.getTable('secrets');
    const hasCompositeIndex = refreshedSecretsTable?.indices.some((idx) => idx.name === SECRETS_OWNER_NAME_INDEX);
    if (!hasCompositeIndex) {
      await queryRunner.createIndex(
        'secrets',
        new TableIndex({ name: SECRETS_OWNER_NAME_INDEX, columnNames: ['owner_id', 'name'], isUnique: true }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const secretsTable = await queryRunner.getTable('secrets');
    if (secretsTable?.indices.some((idx) => idx.name === SECRETS_OWNER_NAME_INDEX)) {
      await queryRunner.dropIndex('secrets', SECRETS_OWNER_NAME_INDEX);
    }

    const hasNameUnique = secretsTable?.uniques.some(
      (u) => u.columnNames.length === 1 && u.columnNames[0] === 'name',
    );
    if (!hasNameUnique) {
      await queryRunner.createUniqueConstraint('secrets', new TableUnique({ columnNames: ['name'] }));
    }

    for (const table of OWNED_TABLES) {
      if (await queryRunner.hasColumn(table, 'owner_id')) {
        await queryRunner.dropColumn(table, 'owner_id');
      }
    }
  }
}

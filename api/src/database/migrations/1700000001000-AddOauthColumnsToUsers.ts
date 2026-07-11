import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

async function addColumnIfMissing(queryRunner: QueryRunner, table: string, column: TableColumn): Promise<void> {
  if (!(await queryRunner.hasColumn(table, column.name))) {
    await queryRunner.addColumn(table, column);
  }
}

export class AddOauthColumnsToUsers1700000001000 implements MigrationInterface {
  name = 'AddOauthColumnsToUsers1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'users',
      new TableColumn({ name: 'google_id', type: 'varchar', isNullable: true, isUnique: true }),
    );
    await addColumnIfMissing(
      queryRunner,
      'users',
      new TableColumn({ name: 'github_id', type: 'varchar', isNullable: true, isUnique: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['google_id', 'github_id']) {
      if (await queryRunner.hasColumn('users', column)) {
        await queryRunner.dropColumn('users', column);
      }
    }
  }
}

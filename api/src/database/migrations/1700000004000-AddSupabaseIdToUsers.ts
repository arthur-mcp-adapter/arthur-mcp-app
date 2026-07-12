import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

async function addColumnIfMissing(queryRunner: QueryRunner, table: string, column: TableColumn): Promise<void> {
  if (!(await queryRunner.hasColumn(table, column.name))) {
    await queryRunner.addColumn(table, column);
  }
}

export class AddSupabaseIdToUsers1700000004000 implements MigrationInterface {
  name = 'AddSupabaseIdToUsers1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'users',
      new TableColumn({ name: 'supabase_id', type: 'varchar', isNullable: true, isUnique: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('users', 'supabase_id')) {
      await queryRunner.dropColumn('users', 'supabase_id');
    }
  }
}

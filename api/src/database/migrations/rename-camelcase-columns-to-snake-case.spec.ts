import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { RenameCamelCaseColumnsToSnakeCase1700000000001 } from './1700000000001-RenameCamelCaseColumnsToSnakeCase';

describe('RenameCamelCaseColumnsToSnakeCase migration', () => {
  let tempDir: string;
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (tempDir) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it('renames legacy camelCase columns to snake_case and is idempotent', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'arthur-mcp-migration-'));
    dataSource = new DataSource({
      type: 'sqlite',
      database: join(tempDir, 'database.sqlite'),
      synchronize: false,
    });
    await dataSource.initialize();

    // Simulate a database migrated before columns were renamed to snake_case.
    await dataSource.query(
      'CREATE TABLE users (id varchar PRIMARY KEY, username varchar, "createdAt" datetime, "updatedAt" datetime)',
    );

    const queryRunner = dataSource.createQueryRunner();
    const migration = new RenameCamelCaseColumnsToSnakeCase1700000000001();

    await migration.up(queryRunner);
    await migration.up(queryRunner); // must not throw when already renamed

    const columns: { name: string }[] = await dataSource.query('PRAGMA table_info(users)');
    const columnNames = columns.map((column) => column.name).sort();

    expect(columnNames).toEqual(['created_at', 'id', 'updated_at', 'username']);

    await migration.down(queryRunner);
    const revertedColumns: { name: string }[] = await dataSource.query('PRAGMA table_info(users)');
    expect(revertedColumns.map((column) => column.name).sort()).toEqual(['createdAt', 'id', 'updatedAt', 'username']);

    await queryRunner.release();
  });
});

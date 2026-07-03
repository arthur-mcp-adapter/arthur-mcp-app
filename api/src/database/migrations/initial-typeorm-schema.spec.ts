import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { InitialTypeormSchema1700000000000 } from './1700000000000-InitialTypeormSchema';

describe('InitialTypeormSchema migration', () => {
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

  it('creates the baseline tables without TypeORM synchronize', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'arthur-mcp-migration-'));
    dataSource = new DataSource({
      type: 'sqlite',
      database: join(tempDir, 'database.sqlite'),
      migrations: [InitialTypeormSchema1700000000000],
      migrationsRun: true,
      synchronize: false,
    });

    await dataSource.initialize();

    const tables = await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?, ?) ORDER BY name",
      ['error_tracking_providers', 'swagger_projects', 'users'],
    );

    expect(tables.map((row: { name: string }) => row.name)).toEqual([
      'error_tracking_providers',
      'swagger_projects',
      'users',
    ]);
  });
});

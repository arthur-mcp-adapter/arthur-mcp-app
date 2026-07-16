import { DataSource } from 'typeorm';
import { InitialTypeormSchema1700000000000 } from './1700000000000-InitialTypeormSchema';
import { AddOAuthConfigToSwaggerProjects1700000000002 } from './1700000000002-AddOAuthConfigToSwaggerProjects';

describe('AddOAuthConfigToSwaggerProjects1700000000002', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqlite', database: ':memory:' });
    await dataSource.initialize();
  });

  afterEach(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('adds OAuth configuration and backfills managed servers', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await new InitialTypeormSchema1700000000000().up(queryRunner);
    await queryRunner.query(
      'INSERT INTO swagger_projects (id, name, base_url, oauth_client_id, oauth_client_secret) VALUES (?, ?, ?, ?, ?)',
      ['server-1', 'Managed', 'https://api.example.com', 'client-id', 'client-secret'],
    );

    await new AddOAuthConfigToSwaggerProjects1700000000002().up(queryRunner);

    const rows = await queryRunner.query('SELECT oauth_config FROM swagger_projects WHERE id = ?', ['server-1']);
    expect(JSON.parse(rows[0].oauth_config)).toEqual({ mode: 'managed' });
    await queryRunner.release();
  });
});

import { Client } from 'pg';
import { executeDbQuery } from '.';

const databaseUrl = process.env.DATA_SOURCE_E2E_POSTGRES_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('PostgreSQL data-source adapter (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query('create table if not exists arthur_operation_test (id integer primary key, name text not null)');
    await client.query('delete from arthur_operation_test');
    await client.query("insert into arthur_operation_test (id, name) values (1, 'Arthur'), (2, 'MCP')");
  });

  afterAll(async () => {
    await client?.query('drop table if exists arthur_operation_test');
    await client?.end();
  });

  it('executes a saved-style parameterized operation against PostgreSQL', async () => {
    const url = new URL(databaseUrl!);
    const result = await executeDbQuery({
      id: 'find-operation',
      name: 'find_operation_test',
      sourceType: 'postgresql',
      query: 'select id, name from arthur_operation_test where id = :id',
      resultMode: 'first',
      parameters: [{ name: 'id', type: 'number', required: true }],
    }, { id: 2 }, {
      host: url.hostname,
      port: Number(url.port),
      database: url.pathname.slice(1),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    });

    expect(result).toEqual({ id: 2, name: 'MCP' });
  });
});

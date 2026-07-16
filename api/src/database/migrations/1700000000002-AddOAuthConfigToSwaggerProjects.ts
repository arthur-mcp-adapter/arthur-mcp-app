import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOAuthConfigToSwaggerProjects1700000000002 implements MigrationInterface {
  name = 'AddOAuthConfigToSwaggerProjects1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('swagger_projects'))) return;
    if (!(await queryRunner.hasColumn('swagger_projects', 'oauth_config'))) {
      await queryRunner.addColumn('swagger_projects', new TableColumn({
        name: 'oauth_config',
        type: 'text',
        isNullable: false,
        default: '\'{"mode":"none"}\'',
      }));
    }

    await queryRunner.query(
      'UPDATE swagger_projects SET oauth_config = \'{"mode":"managed"}\' WHERE oauth_client_id IS NOT NULL AND oauth_client_id <> \'\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('swagger_projects', 'oauth_config')) {
      await queryRunner.dropColumn('swagger_projects', 'oauth_config');
    }
  }
}

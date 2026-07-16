import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import { parseDatabaseUri } from './database-uri';
import { InitialTypeormSchema1700000000000 } from './migrations/1700000000000-InitialTypeormSchema';
import { RenameCamelCaseColumnsToSnakeCase1700000000001 } from './migrations/1700000000001-RenameCamelCaseColumnsToSnakeCase';
import { AddOAuthConfigToSwaggerProjects1700000000002 } from './migrations/1700000000002-AddOAuthConfigToSwaggerProjects';
import { AddOauthColumnsToUsers1700000001000 } from './migrations/1700000001000-AddOauthColumnsToUsers';
import { AddOwnerIdColumns1700000002000 } from './migrations/1700000002000-AddOwnerIdColumns';
import { DropSettingsTable1700000003000 } from './migrations/1700000003000-DropSettingsTable';
import { AddSupabaseIdToUsers1700000004000 } from './migrations/1700000004000-AddSupabaseIdToUsers';

import { UserEntity } from '../users/user.entity';
import { SwaggerProjectEntity } from '../swagger/swagger-project.entity';
import { PasswordResetEntity } from '../auth/password-reset.entity';
import { PromptEntity } from '../prompts/prompt.entity';
import { SecretEntity } from '../secrets/secret.entity';
import { RoleEntity } from '../roles/role.entity';
import { ErrorTrackingProviderEntity } from '../error-tracking/error-tracking-provider.entity';
import { AiProviderEntity } from '../ai-providers/ai-provider.entity';

import { TypeOrmUserRepository } from '../users/repositories/typeorm-user.repository';
import { TypeOrmSwaggerProjectRepository } from '../swagger/repositories/typeorm-swagger-project.repository';
import { TypeOrmPasswordResetRepository } from '../auth/repositories/typeorm-password-reset.repository';
import { TypeOrmPromptRepository } from '../prompts/repositories/typeorm-prompt.repository';
import { TypeOrmSecretRepository } from '../secrets/repositories/typeorm-secret.repository';
import { TypeOrmRoleRepository } from '../roles/repositories/typeorm-role.repository';
import { TypeOrmErrorTrackingProviderRepository } from '../error-tracking/repositories/typeorm-error-tracking-provider.repository';
import { TypeOrmAiProviderRepository } from '../ai-providers/repositories/typeorm-ai-provider.repository';

import { USER_REPO, PROJECT_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO, AI_PROVIDER_REPO } from './database.tokens';

const TYPEORM_ENTITIES = [
  UserEntity,
  SwaggerProjectEntity,
  PasswordResetEntity,
  PromptEntity,
  SecretEntity,
  RoleEntity,
  ErrorTrackingProviderEntity,
  AiProviderEntity,
];

const TYPEORM_MIGRATIONS = [
  InitialTypeormSchema1700000000000,
  RenameCamelCaseColumnsToSnakeCase1700000000001,
  AddOAuthConfigToSwaggerProjects1700000000002,
  AddOauthColumnsToUsers1700000001000,
  AddOwnerIdColumns1700000002000,
  DropSettingsTable1700000003000,
  AddSupabaseIdToUsers1700000004000,
];

function buildTypeOrmOptions(): DataSourceOptions {
  const parsed = parseDatabaseUri(process.env.DATABASE_URI ?? 'sqlite:database.sqlite');
  const synchronize = false;

  if (parsed.type === 'postgres') {
    return {
      type: 'postgres',
      url: parsed.url,
      ssl: parsed.ssl ? { rejectUnauthorized: false } : undefined,
      entities: TYPEORM_ENTITIES,
      migrations: TYPEORM_MIGRATIONS,
      migrationsRun: true,
      synchronize,
    };
  }

  if (parsed.type === 'mysql') {
    return {
      type: 'mysql',
      url: parsed.url,
      charset: 'utf8mb4',
      ssl: parsed.ssl ? {} : undefined,
      entities: TYPEORM_ENTITIES,
      migrations: TYPEORM_MIGRATIONS,
      migrationsRun: true,
      synchronize,
    };
  }

  return {
    type: 'sqlite',
    database: parsed.database,
    entities: TYPEORM_ENTITIES,
    migrations: TYPEORM_MIGRATIONS,
    migrationsRun: true,
    synchronize,
  };
}

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot(buildTypeOrmOptions()),
        TypeOrmModule.forFeature(TYPEORM_ENTITIES),
      ],
      providers: [
        TypeOrmUserRepository,
        TypeOrmSwaggerProjectRepository,
        TypeOrmPasswordResetRepository,
        TypeOrmPromptRepository,
        TypeOrmSecretRepository,
        TypeOrmRoleRepository,
        TypeOrmErrorTrackingProviderRepository,
        TypeOrmAiProviderRepository,
        { provide: USER_REPO, useExisting: TypeOrmUserRepository },
        { provide: PROJECT_REPO, useExisting: TypeOrmSwaggerProjectRepository },
        { provide: PASSWORD_RESET_REPO, useExisting: TypeOrmPasswordResetRepository },
        { provide: PROMPT_REPO, useExisting: TypeOrmPromptRepository },
        { provide: SECRET_REPO, useExisting: TypeOrmSecretRepository },
        { provide: ROLE_REPO, useExisting: TypeOrmRoleRepository },
        { provide: ERROR_TRACKING_PROVIDER_REPO, useExisting: TypeOrmErrorTrackingProviderRepository },
        { provide: AI_PROVIDER_REPO, useExisting: TypeOrmAiProviderRepository },
      ],
      exports: [USER_REPO, PROJECT_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO, AI_PROVIDER_REPO],
    };
  }
}

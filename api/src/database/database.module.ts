import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import { User, UserSchema } from '../users/user.schema';
import { SwaggerProject, SwaggerProjectSchema } from '../swagger/swagger-project.schema';
import { Settings, SettingsSchema } from '../settings/settings.schema';
import { PasswordReset, PasswordResetSchema } from '../auth/password-reset.schema';
import { Prompt, PromptSchema } from '../prompts/prompt.schema';
import { Secret, SecretSchema } from '../secrets/secret.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { ErrorTrackingProvider, ErrorTrackingProviderSchema } from '../error-tracking/error-tracking-provider.schema';
import { AiProvider, AiProviderSchema } from '../ai-providers/ai-provider.schema';

import { UserEntity } from '../users/user.entity';
import { SwaggerProjectEntity } from '../swagger/swagger-project.entity';
import { SettingsEntity } from '../settings/settings.entity';
import { PasswordResetEntity } from '../auth/password-reset.entity';
import { PromptEntity } from '../prompts/prompt.entity';
import { SecretEntity } from '../secrets/secret.entity';
import { RoleEntity } from '../roles/role.entity';
import { ErrorTrackingProviderEntity } from '../error-tracking/error-tracking-provider.entity';
import { AiProviderEntity } from '../ai-providers/ai-provider.entity';

import { MongoUserRepository } from '../users/repositories/mongo-user.repository';
import { TypeOrmUserRepository } from '../users/repositories/typeorm-user.repository';
import { MongoSwaggerProjectRepository } from '../swagger/repositories/mongo-swagger-project.repository';
import { TypeOrmSwaggerProjectRepository } from '../swagger/repositories/typeorm-swagger-project.repository';
import { MongoSettingsRepository } from '../settings/repositories/mongo-settings.repository';
import { TypeOrmSettingsRepository } from '../settings/repositories/typeorm-settings.repository';
import { MongoPasswordResetRepository } from '../auth/repositories/mongo-password-reset.repository';
import { TypeOrmPasswordResetRepository } from '../auth/repositories/typeorm-password-reset.repository';
import { MongoPromptRepository } from '../prompts/repositories/mongo-prompt.repository';
import { TypeOrmPromptRepository } from '../prompts/repositories/typeorm-prompt.repository';
import { MongoSecretRepository } from '../secrets/repositories/mongo-secret.repository';
import { TypeOrmSecretRepository } from '../secrets/repositories/typeorm-secret.repository';
import { MongoRoleRepository } from '../roles/repositories/mongo-role.repository';
import { TypeOrmRoleRepository } from '../roles/repositories/typeorm-role.repository';
import { MongoErrorTrackingProviderRepository } from '../error-tracking/repositories/mongo-error-tracking-provider.repository';
import { TypeOrmErrorTrackingProviderRepository } from '../error-tracking/repositories/typeorm-error-tracking-provider.repository';
import { MongoAiProviderRepository } from '../ai-providers/repositories/mongo-ai-provider.repository';
import { TypeOrmAiProviderRepository } from '../ai-providers/repositories/typeorm-ai-provider.repository';

import { USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO, AI_PROVIDER_REPO } from './database.tokens';

const TYPEORM_ENTITIES = [
  UserEntity,
  SwaggerProjectEntity,
  SettingsEntity,
  PasswordResetEntity,
  PromptEntity,
  SecretEntity,
  RoleEntity,
  ErrorTrackingProviderEntity,
  AiProviderEntity,
];

function buildTypeOrmOptions(): DataSourceOptions {
  const db = (process.env.DATABASE ?? 'sqlite').toLowerCase();
  const syncEnv = process.env.DB_SYNC;

  if (db === 'mysql') {
    return {
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? {} : undefined,
      entities: TYPEORM_ENTITIES,
      synchronize: syncEnv === 'true',
    };
  }

  if (db === 'postgres' || db === 'postgresql') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      entities: TYPEORM_ENTITIES,
      synchronize: syncEnv === 'true',
    };
  }

  return {
    type: 'sqlite',
    database: process.env.SQLITE_PATH ?? 'database.sqlite',
    entities: TYPEORM_ENTITIES,
    synchronize: true,
  };
}

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const isMongo = (process.env.DATABASE ?? 'sqlite').toLowerCase() === 'mongodb';

    if (isMongo) {
      return {
        global: true,
        module: DatabaseModule,
        imports: [
          MongooseModule.forRootAsync({
            useFactory: () => ({ uri: process.env.MONGODB_URI }),
          }),
          MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: SwaggerProject.name, schema: SwaggerProjectSchema },
            { name: Settings.name, schema: SettingsSchema },
            { name: PasswordReset.name, schema: PasswordResetSchema },
            { name: Prompt.name, schema: PromptSchema },
            { name: Secret.name, schema: SecretSchema },
            { name: Role.name, schema: RoleSchema },
            { name: ErrorTrackingProvider.name, schema: ErrorTrackingProviderSchema },
            { name: AiProvider.name, schema: AiProviderSchema },
          ]),
        ],
        providers: [
          MongoUserRepository,
          MongoSwaggerProjectRepository,
          MongoSettingsRepository,
          MongoPasswordResetRepository,
          MongoPromptRepository,
          MongoSecretRepository,
          MongoRoleRepository,
          MongoErrorTrackingProviderRepository,
          MongoAiProviderRepository,
          { provide: USER_REPO, useExisting: MongoUserRepository },
          { provide: PROJECT_REPO, useExisting: MongoSwaggerProjectRepository },
          { provide: SETTINGS_REPO, useExisting: MongoSettingsRepository },
          { provide: PASSWORD_RESET_REPO, useExisting: MongoPasswordResetRepository },
          { provide: PROMPT_REPO, useExisting: MongoPromptRepository },
          { provide: SECRET_REPO, useExisting: MongoSecretRepository },
          { provide: ROLE_REPO, useExisting: MongoRoleRepository },
          { provide: ERROR_TRACKING_PROVIDER_REPO, useExisting: MongoErrorTrackingProviderRepository },
          { provide: AI_PROVIDER_REPO, useExisting: MongoAiProviderRepository },
        ],
        exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO, AI_PROVIDER_REPO],
      };
    }

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
        TypeOrmSettingsRepository,
        TypeOrmPasswordResetRepository,
        TypeOrmPromptRepository,
        TypeOrmSecretRepository,
        TypeOrmRoleRepository,
        TypeOrmErrorTrackingProviderRepository,
        TypeOrmAiProviderRepository,
        { provide: USER_REPO, useExisting: TypeOrmUserRepository },
        { provide: PROJECT_REPO, useExisting: TypeOrmSwaggerProjectRepository },
        { provide: SETTINGS_REPO, useExisting: TypeOrmSettingsRepository },
        { provide: PASSWORD_RESET_REPO, useExisting: TypeOrmPasswordResetRepository },
        { provide: PROMPT_REPO, useExisting: TypeOrmPromptRepository },
        { provide: SECRET_REPO, useExisting: TypeOrmSecretRepository },
        { provide: ROLE_REPO, useExisting: TypeOrmRoleRepository },
        { provide: ERROR_TRACKING_PROVIDER_REPO, useExisting: TypeOrmErrorTrackingProviderRepository },
        { provide: AI_PROVIDER_REPO, useExisting: TypeOrmAiProviderRepository },
      ],
      exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO, AI_PROVIDER_REPO],
    };
  }
}

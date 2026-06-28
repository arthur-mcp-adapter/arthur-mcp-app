import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, UserSchema } from '../users/user.schema';
import { SwaggerProject, SwaggerProjectSchema } from '../swagger/swagger-project.schema';
import { Settings, SettingsSchema } from '../settings/settings.schema';
import { PasswordReset, PasswordResetSchema } from '../auth/password-reset.schema';
import { Prompt, PromptSchema } from '../prompts/prompt.schema';
import { Secret, SecretSchema } from '../secrets/secret.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { ErrorTrackingProvider, ErrorTrackingProviderSchema } from '../error-tracking/error-tracking-provider.schema';

import { UserEntity } from '../users/user.entity';
import { SwaggerProjectEntity } from '../swagger/swagger-project.entity';
import { SettingsEntity } from '../settings/settings.entity';
import { PasswordResetEntity } from '../auth/password-reset.entity';
import { PromptEntity } from '../prompts/prompt.entity';
import { SecretEntity } from '../secrets/secret.entity';
import { RoleEntity } from '../roles/role.entity';
import { ErrorTrackingProviderEntity } from '../error-tracking/error-tracking-provider.entity';

import { MongoUserRepository } from '../users/repositories/mongo-user.repository';
import { SqliteUserRepository } from '../users/repositories/sqlite-user.repository';
import { MongoSwaggerProjectRepository } from '../swagger/repositories/mongo-swagger-project.repository';
import { SqliteSwaggerProjectRepository } from '../swagger/repositories/sqlite-swagger-project.repository';
import { MongoSettingsRepository } from '../settings/repositories/mongo-settings.repository';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';
import { MongoPasswordResetRepository } from '../auth/repositories/mongo-password-reset.repository';
import { SqlitePasswordResetRepository } from '../auth/repositories/sqlite-password-reset.repository';
import { MongoPromptRepository } from '../prompts/repositories/mongo-prompt.repository';
import { SqlitePromptRepository } from '../prompts/repositories/sqlite-prompt.repository';
import { MongoSecretRepository } from '../secrets/repositories/mongo-secret.repository';
import { SqliteSecretRepository } from '../secrets/repositories/sqlite-secret.repository';
import { MongoRoleRepository } from '../roles/repositories/mongo-role.repository';
import { SqliteRoleRepository } from '../roles/repositories/sqlite-role.repository';
import { MongoErrorTrackingProviderRepository } from '../error-tracking/repositories/mongo-error-tracking-provider.repository';
import { SqliteErrorTrackingProviderRepository } from '../error-tracking/repositories/sqlite-error-tracking-provider.repository';

import { USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO } from './database.tokens';

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
          { provide: USER_REPO, useExisting: MongoUserRepository },
          { provide: PROJECT_REPO, useExisting: MongoSwaggerProjectRepository },
          { provide: SETTINGS_REPO, useExisting: MongoSettingsRepository },
          { provide: PASSWORD_RESET_REPO, useExisting: MongoPasswordResetRepository },
          { provide: PROMPT_REPO, useExisting: MongoPromptRepository },
          { provide: SECRET_REPO, useExisting: MongoSecretRepository },
          { provide: ROLE_REPO, useExisting: MongoRoleRepository },
          { provide: ERROR_TRACKING_PROVIDER_REPO, useExisting: MongoErrorTrackingProviderRepository },
        ],
        exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO],
      };
    }

    return {
      global: true,
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: process.env.SQLITE_PATH ?? 'database.sqlite',
          entities: [UserEntity, SwaggerProjectEntity, SettingsEntity, PasswordResetEntity, PromptEntity, SecretEntity, RoleEntity, ErrorTrackingProviderEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([UserEntity, SwaggerProjectEntity, SettingsEntity, PasswordResetEntity, PromptEntity, SecretEntity, RoleEntity, ErrorTrackingProviderEntity]),
      ],
      providers: [
        SqliteUserRepository,
        SqliteSwaggerProjectRepository,
        SqliteSettingsRepository,
        SqlitePasswordResetRepository,
        SqlitePromptRepository,
        SqliteSecretRepository,
        SqliteRoleRepository,
        SqliteErrorTrackingProviderRepository,
        { provide: USER_REPO, useExisting: SqliteUserRepository },
        { provide: PROJECT_REPO, useExisting: SqliteSwaggerProjectRepository },
        { provide: SETTINGS_REPO, useExisting: SqliteSettingsRepository },
        { provide: PASSWORD_RESET_REPO, useExisting: SqlitePasswordResetRepository },
        { provide: PROMPT_REPO, useExisting: SqlitePromptRepository },
        { provide: SECRET_REPO, useExisting: SqliteSecretRepository },
        { provide: ROLE_REPO, useExisting: SqliteRoleRepository },
        { provide: ERROR_TRACKING_PROVIDER_REPO, useExisting: SqliteErrorTrackingProviderRepository },
      ],
      exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO, PROMPT_REPO, SECRET_REPO, ROLE_REPO, ERROR_TRACKING_PROVIDER_REPO],
    };
  }
}

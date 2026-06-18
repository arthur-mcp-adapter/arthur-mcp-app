import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, UserSchema } from '../users/user.schema';
import { SwaggerProject, SwaggerProjectSchema } from '../swagger/swagger-project.schema';
import { Settings, SettingsSchema } from '../settings/settings.schema';
import { PasswordReset, PasswordResetSchema } from '../auth/password-reset.schema';

import { UserEntity } from '../users/user.entity';
import { SwaggerProjectEntity } from '../swagger/swagger-project.entity';
import { SettingsEntity } from '../settings/settings.entity';
import { PasswordResetEntity } from '../auth/password-reset.entity';

import { MongoUserRepository } from '../users/repositories/mongo-user.repository';
import { SqliteUserRepository } from '../users/repositories/sqlite-user.repository';
import { MongoSwaggerProjectRepository } from '../swagger/repositories/mongo-swagger-project.repository';
import { SqliteSwaggerProjectRepository } from '../swagger/repositories/sqlite-swagger-project.repository';
import { MongoSettingsRepository } from '../settings/repositories/mongo-settings.repository';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';
import { MongoPasswordResetRepository } from '../auth/repositories/mongo-password-reset.repository';
import { SqlitePasswordResetRepository } from '../auth/repositories/sqlite-password-reset.repository';

import { USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO } from './database.tokens';

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
          ]),
        ],
        providers: [
          MongoUserRepository,
          MongoSwaggerProjectRepository,
          MongoSettingsRepository,
          MongoPasswordResetRepository,
          { provide: USER_REPO, useExisting: MongoUserRepository },
          { provide: PROJECT_REPO, useExisting: MongoSwaggerProjectRepository },
          { provide: SETTINGS_REPO, useExisting: MongoSettingsRepository },
          { provide: PASSWORD_RESET_REPO, useExisting: MongoPasswordResetRepository },
        ],
        exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO],
      };
    }

    return {
      global: true,
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: process.env.SQLITE_PATH ?? 'database.sqlite',
          entities: [UserEntity, SwaggerProjectEntity, SettingsEntity, PasswordResetEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([UserEntity, SwaggerProjectEntity, SettingsEntity, PasswordResetEntity]),
      ],
      providers: [
        SqliteUserRepository,
        SqliteSwaggerProjectRepository,
        SqliteSettingsRepository,
        SqlitePasswordResetRepository,
        { provide: USER_REPO, useExisting: SqliteUserRepository },
        { provide: PROJECT_REPO, useExisting: SqliteSwaggerProjectRepository },
        { provide: SETTINGS_REPO, useExisting: SqliteSettingsRepository },
        { provide: PASSWORD_RESET_REPO, useExisting: SqlitePasswordResetRepository },
      ],
      exports: [USER_REPO, PROJECT_REPO, SETTINGS_REPO, PASSWORD_RESET_REPO],
    };
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { config } from '../config/configuration';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { JwtStrategy } from './jwt.strategy';
import { LocalAuthGuard } from './local.guard';
import { LocalStrategy } from './local.strategy';
import { GoogleAuthGuard } from './google.guard';
import { GoogleStrategy } from './google.strategy';
import { GithubAuthGuard } from './github.guard';
import { GithubStrategy } from './github.strategy';

// Google/GitHub sign-in only activate once their client id/secret are configured,
// so forks without those env vars still boot (passport strategies throw on missing clientID).
const oauthProviders = [
  ...(config.googleClientId && config.googleClientSecret ? [GoogleStrategy] : []),
  ...(config.githubClientId && config.githubClientSecret ? [GithubStrategy] : []),
];

@Module({
  imports: [
    PassportModule,
    UsersModule,
    SettingsModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    LocalStrategy,
    LocalAuthGuard,
    GoogleAuthGuard,
    GithubAuthGuard,
    ...oauthProviders,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}

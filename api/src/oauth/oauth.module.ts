import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { ExternalOAuthTokenValidatorService } from './external-oauth-token-validator.service';

@Module({
  imports: [UsersModule, SettingsModule],
  controllers: [OAuthController],
  providers: [OAuthService, ExternalOAuthTokenValidatorService],
  exports: [OAuthService, ExternalOAuthTokenValidatorService],
})
export class OAuthModule {}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { config } from '../config/configuration';
import { UsersService } from '../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly users: UsersService) {
    super({
      // Strategies are always registered so .env can be loaded by ConfigModule
      // before this constructor runs. Disabled providers use inert credentials.
      clientID: config.googleClientId || 'disabled',
      clientSecret: config.googleClientSecret || 'disabled',
      callbackURL: '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Google account has no verified email.'), false);

    const user = await this.users.findOrCreateFromOAuth('google', {
      id: profile.id,
      email,
      name: profile.displayName,
    });
    done(null, { _id: user._id, username: user.username, role: user.role });
  }
}

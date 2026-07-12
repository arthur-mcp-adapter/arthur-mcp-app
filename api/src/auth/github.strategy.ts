import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { config } from '../config/configuration';
import { UsersService } from '../users/users.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly users: UsersService) {
    super({
      clientID: config.githubClientId || 'disabled',
      clientSecret: config.githubClientSecret || 'disabled',
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) {
    const email = profile.emails?.[0]?.value ?? `${profile.username}@users.noreply.github.com`;

    const user = await this.users.findOrCreateFromOAuth('github', {
      id: profile.id,
      email,
      name: profile.displayName || profile.username,
    });
    done(null, { _id: user._id, username: user.username, role: user.role });
  }
}

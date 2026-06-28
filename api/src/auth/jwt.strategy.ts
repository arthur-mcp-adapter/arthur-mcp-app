import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(jwtSecretService: JwtSecretService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (_request, _rawJwtToken, done) => {
        try {
          done(null, await jwtSecretService.getSecret());
        } catch (err) {
          done(err, undefined);
        }
      },
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}

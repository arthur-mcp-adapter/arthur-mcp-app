import { Injectable } from '@nestjs/common';
import { config } from '../config/configuration';

@Injectable()
export class JwtSecretService {
  async getSecret(): Promise<string> {
    return config.jwtSecret;
  }
}

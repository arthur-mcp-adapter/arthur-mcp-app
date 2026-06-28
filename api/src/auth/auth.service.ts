import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { PASSWORD_RESET_REPO } from '../database/database.tokens';
import { IPasswordResetRepository } from './password-reset.repository';
import { SettingsService } from '../settings/settings.service';
import { JwtSecretService } from '../settings/jwt-secret.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

export interface AuthUser {
  _id: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly settingsService: SettingsService,
    private readonly jwtSecretService: JwtSecretService,
    @Inject(PASSWORD_RESET_REPO) private readonly resetRepo: IPasswordResetRepository,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    const valid = await this.users.validatePassword(password, user.password);
    if (!valid) return null;
    return { _id: user._id, username: user.username, role: user.role };
  }

  async login(user: AuthUser): Promise<{ access_token: string }> {
    const payload: JwtPayload = { sub: user._id, username: user.username, role: user.role };
    const secret = await this.jwtSecretService.getSecret();
    return { access_token: await this.jwt.signAsync(payload, { secret, expiresIn: '24h' }) };
  }

  async register(username: string, password: string, email: string): Promise<{ access_token: string }> {
    const [byUsername, byEmail] = await Promise.all([
      this.users.findByUsername(username),
      this.users.findByEmail(email),
    ]);
    if (byUsername || byEmail) throw new ConflictException('Username or email already registered');
    const user = await this.users.create(username, password, email);
    return this.login({ _id: user._id, username: user.username, role: user.role });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;

    await this.resetRepo.deleteByUserId(user._id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.resetRepo.create({ userId: user._id, token, expiresAt });

    const settings = await this.settingsService.get();
    const baseUrl = settings.serverBaseUrl || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    if (settings.smtpHost && settings.smtpUser) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          auth: { user: settings.smtpUser, pass: settings.smtpPass },
        });
        await transporter.sendMail({
          from: settings.smtpFrom || settings.smtpUser,
          to: email,
          subject: 'Password reset — Arthur MCP Adapter',
          text: `Click the link to reset your password (valid for 1 hour):\n\n${resetLink}`,
          html: `<p>Click the link to reset your password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        });
      } catch (err: any) {
        this.logger.error(`Failed to send password reset email: ${err?.message}`);
      }
    } else {
      this.logger.warn(`SMTP not configured. Reset link for ${email}: ${resetLink}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetRepo.findByToken(token);
    if (!record) throw new BadRequestException('Invalid or already used token.');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expired.');

    const user = await this.users.findById(record.userId);
    if (!user) throw new NotFoundException('User not found.');

    await this.users.updateByAdmin(record.userId, { password: newPassword });
    await this.resetRepo.markUsed(record._id);
  }
}

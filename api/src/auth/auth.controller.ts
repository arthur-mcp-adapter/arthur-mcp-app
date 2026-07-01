import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local.guard';

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  login(@Request() req: any): Promise<{ access_token: string }> {
    return this.authService.login(req.user);
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: unknown): Promise<{ access_token: string }> {
    const { username, email, password } = RegisterSchema.parse(body);
    return this.authService.register(username, password, email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body('email') email: string): Promise<{ message: string }> {
    if (!email) throw new Error('Email is required.');
    await this.authService.forgotPassword(email);
    return { message: 'If the email is registered, you will receive instructions shortly.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    if (!token || !newPassword) throw new Error('Token and new password are required.');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Senha redefinida com sucesso.' };
  }
}

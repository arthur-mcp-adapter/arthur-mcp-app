import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { JwtSecretService } from '../settings/jwt-secret.service';
import { PASSWORD_RESET_REPO } from '../database/database.tokens';

const mockUser = { _id: 'user123', username: 'testuser', password: 'hashed', role: 'user' };

const mockUsersService = {
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  validatePassword: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updateByAdmin: jest.fn(),
};

const mockJwtService = { signAsync: jest.fn().mockResolvedValue('jwt.token.here') };
const mockJwtSecretService = { getSecret: jest.fn().mockResolvedValue('test-jwt-secret-value') };

const mockPasswordResetRepo = {
  findByToken: jest.fn(),
  create: jest.fn().mockResolvedValue({}),
  deleteByUserId: jest.fn().mockResolvedValue(undefined),
  markUsed: jest.fn().mockResolvedValue(undefined),
};

const mockSettingsService = {
  get: jest.fn().mockResolvedValue({ serverBaseUrl: 'http://localhost:3000', smtpHost: null }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: JwtSecretService, useValue: mockJwtSecretService },
        { provide: PASSWORD_RESET_REPO, useValue: mockPasswordResetRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('jwt.token.here');
    mockJwtSecretService.getSecret.mockResolvedValue('test-jwt-secret-value');
    mockSettingsService.get.mockResolvedValue({ serverBaseUrl: 'http://localhost:3000', smtpHost: null });
    mockPasswordResetRepo.create.mockResolvedValue({});
    mockPasswordResetRepo.deleteByUserId.mockResolvedValue(undefined);
    mockPasswordResetRepo.markUsed.mockResolvedValue(undefined);
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      expect(await service.validateUser('unknown', 'pass')).toBeNull();
    });

    it('returns null when password is wrong', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);
      expect(await service.validateUser('testuser', 'wrong')).toBeNull();
    });

    it('returns user object when credentials are valid', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);
      const result = await service.validateUser('testuser', 'correct');
      expect(result).toEqual({ _id: 'user123', username: 'testuser', role: 'user' });
    });
  });

  describe('login', () => {
    it('returns access_token signed by JwtService', async () => {
      const result = await service.login({ _id: 'user123', username: 'testuser', role: 'user' });
      expect(result).toEqual({ access_token: 'jwt.token.here' });
      expect(mockJwtSecretService.getSecret).toHaveBeenCalledTimes(1);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user123', username: 'testuser', role: 'user' },
        { secret: 'test-jwt-secret-value', expiresIn: '24h' },
      );
    });
  });

  describe('register', () => {
    it('throws ConflictException if username already exists', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.register('testuser', 'pass', 'email@test.com')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if email already exists', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(service.register('newuser', 'pass', 'existing@test.com')).rejects.toThrow(ConflictException);
    });

    it('creates user and returns access_token', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      const result = await service.register('newuser', 'pass', 'new@test.com');
      expect(result).toEqual({ access_token: 'jwt.token.here' });
      expect(mockUsersService.create).toHaveBeenCalledWith('newuser', 'pass', 'new@test.com');
    });
  });

  describe('forgotPassword', () => {
    it('returns silently when email not found (no leak)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('unknown@test.com')).resolves.toBeUndefined();
      expect(mockPasswordResetRepo.create).not.toHaveBeenCalled();
    });

    it('creates reset token when email exists and SMTP not configured', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await service.forgotPassword('test@test.com');
      expect(mockPasswordResetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user123', token: expect.any(String) }),
      );
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid or used token', async () => {
      mockPasswordResetRepo.findByToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'newpass')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      const expired = { _id: 'r1', token: 'tok', used: false, expiresAt: new Date(Date.now() - 1000), userId: 'user123' };
      mockPasswordResetRepo.findByToken.mockResolvedValue(expired);
      await expect(service.resetPassword('tok', 'newpass')).rejects.toThrow(BadRequestException);
    });

    it('updates password and marks token as used', async () => {
      const record = {
        _id: 'r1', token: 'valid-tok', used: false, userId: 'user123',
        expiresAt: new Date(Date.now() + 60_000),
      };
      mockPasswordResetRepo.findByToken.mockResolvedValue(record);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.updateByAdmin.mockResolvedValue({});

      await service.resetPassword('valid-tok', 'newpass123');

      expect(mockUsersService.updateByAdmin).toHaveBeenCalledWith('user123', { password: 'newpass123' });
      expect(mockPasswordResetRepo.markUsed).toHaveBeenCalledWith('r1');
    });
  });
});

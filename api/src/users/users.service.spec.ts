import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { USER_REPO } from '../database/database.tokens';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const makeUserRecord = (overrides: Record<string, any> = {}) => ({
  _id: 'user123',
  username: 'testuser',
  email: 'test@test.com',
  password: 'hashed',
  role: 'user',
  ...overrides,
});

const mockUserRepo = {
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPO, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('resolves the user document', async () => {
      const doc = makeUserRecord();
      mockUserRepo.findByUsername.mockResolvedValue(doc);
      expect(await service.findByUsername('testuser')).toBe(doc);
      expect(mockUserRepo.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('returns null when user does not exist', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);
      expect(await service.findByUsername('unknown')).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns the user document', async () => {
      const doc = makeUserRecord();
      mockUserRepo.findByEmail.mockResolvedValue(doc);
      expect(await service.findByEmail('test@test.com')).toBe(doc);
    });

    it('returns null when email not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      expect(await service.findByEmail('none@test.com')).toBeNull();
    });
  });

  describe('create', () => {
    it('hashes password and persists user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      const doc = makeUserRecord();
      mockUserRepo.create.mockResolvedValue(doc);

      const result = await service.create('newuser', 'plainpass', 'new@test.com');

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpass', 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser', email: 'new@test.com', password: 'hashed_pw', role: 'admin' }),
      );
      expect(result).toBe(doc);
    });

    it('lowercases and trims username and email', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('h');
      mockUserRepo.create.mockResolvedValue(makeUserRecord());
      await service.create('  NewUser  ', 'pass', '  New@Test.com  ');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser', email: 'new@test.com' }),
      );
    });
  });

  describe('validatePassword', () => {
    it('returns true when password matches', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      expect(await service.validatePassword('plain', 'hash')).toBe(true);
    });

    it('returns false when password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      expect(await service.validatePassword('wrong', 'hash')).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const doc = makeUserRecord();
      mockUserRepo.findById.mockResolvedValue(doc);
      expect(await service.findById('user123')).toBe(doc);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSelf', () => {
    it('throws BadRequestException when newPassword given without currentPassword', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUserRecord());
      await expect(service.updateSelf('user123', { newPassword: 'newpass' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when currentPassword is wrong', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUserRecord());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.updateSelf('user123', { currentPassword: 'wrong', newPassword: 'newpass' })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when username is already taken', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUserRecord());
      mockUserRepo.findByUsername.mockResolvedValue(makeUserRecord({ username: 'taken' }));
      await expect(service.updateSelf('user123', { username: 'taken' })).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email is already taken', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUserRecord());
      mockUserRepo.findByEmail.mockResolvedValue(makeUserRecord({ email: 'taken@test.com' }));
      await expect(service.updateSelf('user123', { email: 'taken@test.com' })).rejects.toThrow(ConflictException);
    });

    it('saves and returns user without password field', async () => {
      const doc = makeUserRecord();
      mockUserRepo.findById.mockResolvedValue(doc);
      mockUserRepo.findByUsername.mockResolvedValue(null);
      mockUserRepo.update.mockResolvedValue({ ...doc, username: 'newname' });
      const result = await service.updateSelf('user123', { username: 'newname' });
      expect(mockUserRepo.update).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('updateByAdmin', () => {
    it('updates role and saves', async () => {
      const doc = makeUserRecord();
      mockUserRepo.findById.mockResolvedValue(doc);
      mockUserRepo.findByUsername.mockResolvedValue(null);
      mockUserRepo.update.mockResolvedValue({ ...doc, role: 'admin' });
      const result = await service.updateByAdmin('user123', { role: 'admin' });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user123', expect.objectContaining({ role: 'admin' }));
      expect(result).not.toHaveProperty('password');
    });

    it('hashes new password when provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      const doc = makeUserRecord();
      mockUserRepo.findById.mockResolvedValue(doc);
      mockUserRepo.findByUsername.mockResolvedValue(null);
      mockUserRepo.update.mockResolvedValue({ ...doc, password: 'new_hash' });
      await service.updateByAdmin('user123', { password: 'newplain' });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user123', expect.objectContaining({ password: 'new_hash' }));
    });
  });

});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ROLE_REPO } from '../database/database.tokens';
import type { RoleRecord, RolePermissions } from './role.repository';

const allOff: RolePermissions = {
  servers_view: false, servers_create: false, servers_edit_settings: false, servers_manage_connection: false,
  servers_delete: false, servers_toggle_active: false, servers_share: false,
  tools_view: false, tools_create: false, tools_edit: false,
  tools_delete: false, tools_test: false,
  resources_view: false, resources_create: false, resources_edit: false, resources_delete: false,
  prompts_view: false, prompts_create: false, prompts_edit: false, prompts_delete: false,
  secrets_view_names: false, secrets_reveal_values: false, secrets_create: false,
  secrets_edit: false, secrets_delete: false,
  api_keys_view: false, api_keys_create: false, api_keys_delete: false,
  users_view: false, users_invite: false, users_edit: false, users_delete: false,
  roles_view: false, roles_manage: false,
  audit_view: false, audit_export: false, templates_use: false, settings_manage: false, endpoints_create: false,
  observability_view: false, observability_create: false, observability_edit: false, observability_delete: false,
  error_tracking_view: false, error_tracking_create: false, error_tracking_edit: false, error_tracking_delete: false,
  ai_providers_view: false, ai_providers_create: false, ai_providers_edit: false, ai_providers_delete: false, ai_providers_execute: false,
};

const makeRole = (overrides: Partial<RoleRecord> = {}): RoleRecord => ({
  id: 'role-1',
  name: 'analyst',
  description: 'An analyst role',
  permissions: { ...allOff },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockRoleRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: ROLE_REPO, useValue: mockRoleRepo },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('delegates to roleRepo.findAll', async () => {
      const roles = [makeRole()];
      mockRoleRepo.findAll.mockResolvedValue(roles);
      const result = await service.findAll();
      expect(result).toBe(roles);
      expect(mockRoleRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('throws BadRequestException when name already exists', async () => {
      mockRoleRepo.findByName.mockResolvedValue(makeRole());
      await expect(service.create({ name: 'analyst' })).rejects.toThrow(BadRequestException);
    });

    it('returns new role with all_permissions_off defaults', async () => {
      mockRoleRepo.findByName.mockResolvedValue(null);
      const created = makeRole({ name: 'newrole', permissions: { ...allOff } });
      mockRoleRepo.create.mockResolvedValue(created);

      const result = await service.create({ name: 'newrole' });

      expect(mockRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'newrole', permissions: expect.objectContaining({ servers_view: false }) }),
      );
      expect(result).toBe(created);
    });

    it('merges provided permissions with all_permissions_off defaults', async () => {
      mockRoleRepo.findByName.mockResolvedValue(null);
      const created = makeRole({ permissions: { ...allOff, servers_view: true } });
      mockRoleRepo.create.mockResolvedValue(created);

      await service.create({ name: 'newrole', permissions: { servers_view: true } });

      expect(mockRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: expect.objectContaining({ servers_view: true, servers_create: false }) }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when role does not exist', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing-id', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('merges permissions — existing keys not in dto stay unchanged', async () => {
      const existing = makeRole({ permissions: { ...allOff, servers_view: true, tools_view: true } });
      mockRoleRepo.findById.mockResolvedValue(existing);
      mockRoleRepo.findByName.mockResolvedValue(null);
      const updated = makeRole({ permissions: { ...allOff, servers_view: true, tools_view: true, servers_create: true } });
      mockRoleRepo.update.mockResolvedValue(updated);

      await service.update('role-1', { permissions: { servers_create: true } });

      expect(mockRoleRepo.update).toHaveBeenCalledWith(
        'role-1',
        expect.objectContaining({
          permissions: expect.objectContaining({ servers_view: true, tools_view: true, servers_create: true }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('delegates to roleRepo.delete', async () => {
      mockRoleRepo.delete.mockResolvedValue(true);
      await expect(service.delete('role-1')).resolves.toBeUndefined();
      expect(mockRoleRepo.delete).toHaveBeenCalledWith('role-1');
    });

    it('throws NotFoundException when role not found', async () => {
      mockRoleRepo.delete.mockResolvedValue(false);
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

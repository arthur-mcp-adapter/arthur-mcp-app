import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ROLE_REPO } from '../../database/database.tokens';
import type { RoleRecord, RolePermissions } from '../../roles/role.repository';

const allOff = (): RolePermissions => ({
  servers_view: false, servers_create: false, servers_edit_settings: false,
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
  ai_providers_view: false, ai_providers_create: false, ai_providers_edit: false, ai_providers_delete: false,
});

function makeContext(user: { userId: string; username: string; role: string } | undefined): ExecutionContext {
  const request = { user };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const mockReflector = { getAllAndOverride: jest.fn() };

const mockRoleRepo = { findByName: jest.fn() };

let guard: PermissionsGuard;

beforeEach(() => {
  jest.clearAllMocks();
  guard = new PermissionsGuard(mockReflector as unknown as Reflector, mockRoleRepo as any);
});

describe('PermissionsGuard', () => {
  it('returns true when no @RequirePermission decorator is present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'viewer' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('returns true for admin role on any permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('servers_delete');
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'admin' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException for built-in role without the permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('servers_delete');
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'developer' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns true for built-in role with the permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('servers_view');
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'developer' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('looks up dynamic role from repo when role is not built-in', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('servers_view');
    const dynamicRole: RoleRecord = {
      id: 'r1', name: 'custom', permissions: { ...allOff(), servers_view: true },
      createdAt: new Date(), updatedAt: new Date(),
    };
    mockRoleRepo.findByName.mockResolvedValue(dynamicRole);
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'custom' });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(mockRoleRepo.findByName).toHaveBeenCalledWith('custom');
  });

  it('throws ForbiddenException for dynamic role without the permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('users_delete');
    const dynamicRole: RoleRecord = {
      id: 'r1', name: 'custom', permissions: allOff(),
      createdAt: new Date(), updatedAt: new Date(),
    };
    mockRoleRepo.findByName.mockResolvedValue(dynamicRole);
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'custom' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when dynamic role not found in DB', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('servers_view');
    mockRoleRepo.findByName.mockResolvedValue(null);
    const ctx = makeContext({ userId: 'u1', username: 'alice', role: 'ghostrole' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});

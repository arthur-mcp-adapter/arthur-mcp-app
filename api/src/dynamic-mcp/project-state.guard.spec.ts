import { ProjectStateGuard } from './project-state.guard';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

const makeContext = (serverId = 'server-1') => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return {
    res,
    ctx: {
      switchToHttp: () => ({
        getRequest: () => ({ params: { serverId } }),
        getResponse: () => res,
      }),
    } as any,
  };
};

describe('ProjectStateGuard', () => {
  const repo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findByIdOrShareSlug'>> = {
    findByIdOrShareSlug: jest.fn(),
  };

  let guard: ProjectStateGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ProjectStateGuard(repo as unknown as ISwaggerProjectRepository);
  });

  it('allows missing servers and active servers', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce(null);
    await expect(guard.canActivate(makeContext().ctx)).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({
      name: 'Payments',
      isPaused: false,
      maintenanceMode: { enabled: false },
      availabilityWindow: { enabled: false },
    } as any);
    await expect(guard.canActivate(makeContext().ctx)).resolves.toBe(true);
  });

  it('blocks paused servers', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({ name: 'Payments', isPaused: true } as any);
    const { ctx, res } = makeContext();

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Project paused' }));
  });

  it('blocks servers in maintenance mode with custom or fallback message', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce({
      name: 'Payments',
      maintenanceMode: { enabled: true, message: 'Back soon' },
    } as any);
    const first = makeContext();
    await expect(guard.canActivate(first.ctx)).resolves.toBe(false);
    expect(first.res.json).toHaveBeenCalledWith({ error: 'Maintenance mode', message: 'Back soon' });

    repo.findByIdOrShareSlug.mockResolvedValueOnce({
      name: 'Payments',
      maintenanceMode: { enabled: true, message: ' ' },
    } as any);
    const second = makeContext();
    await expect(guard.canActivate(second.ctx)).resolves.toBe(false);
    expect(second.res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Maintenance mode' }));
  });

  it('allows requests inside the availability window and blocks outside it', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T10:00:00.000Z'));

    repo.findByIdOrShareSlug.mockResolvedValueOnce({
      name: 'Payments',
      availabilityWindow: {
        enabled: true,
        timezone: 'UTC',
        schedule: [{ day: 1, startHour: 9, endHour: 17 }],
      },
    } as any);
    await expect(guard.canActivate(makeContext().ctx)).resolves.toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({
      name: 'Payments',
      availabilityWindow: {
        enabled: true,
        timezone: 'UTC',
        schedule: [{ day: 1, startHour: 11, endHour: 17 }],
      },
    } as any);
    const blocked = makeContext();
    await expect(guard.canActivate(blocked.ctx)).resolves.toBe(false);
    expect(blocked.res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Outside availability window' }));

    jest.useRealTimers();
  });
});

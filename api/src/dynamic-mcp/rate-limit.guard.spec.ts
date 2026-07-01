import { HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

const makeContext = (serverId = 'server-1') => {
  const res = { setHeader: jest.fn() };
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

describe('RateLimitGuard', () => {
  const repo: jest.Mocked<Pick<ISwaggerProjectRepository, 'findByIdOrShareSlug'>> = {
    findByIdOrShareSlug: jest.fn(),
  };

  let guard: RateLimitGuard;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    jest.clearAllMocks();
    guard = new RateLimitGuard(repo as unknown as ISwaggerProjectRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests when rate limiting is disabled or server is missing', async () => {
    repo.findByIdOrShareSlug.mockResolvedValueOnce(null);
    expect(await guard.canActivate(makeContext().ctx)).toBe(true);

    repo.findByIdOrShareSlug.mockResolvedValueOnce({ rateLimit: { enabled: false } } as any);
    expect(await guard.canActivate(makeContext().ctx)).toBe(true);
  });

  it('sets rate limit headers and allows requests below the limit', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({ _id: 'server-1', rateLimit: { enabled: true, requestsPerMinute: 2 } } as any);
    const { ctx, res } = makeContext();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 2);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
  });

  it('throws when the per-minute limit is exceeded and resets after the window', async () => {
    repo.findByIdOrShareSlug.mockResolvedValue({ _id: 'server-1', shareSlug: 'payments-api', rateLimit: { enabled: true, requestsPerMinute: 1 } } as any);

    await guard.canActivate(makeContext().ctx);
    await expect(guard.canActivate(makeContext('payments-api').ctx)).rejects.toThrow(HttpException);

    jest.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));
    await expect(guard.canActivate(makeContext().ctx)).resolves.toBe(true);
  });
});

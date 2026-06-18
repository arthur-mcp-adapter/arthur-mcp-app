import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PROJECT_REPO } from '../database/database.tokens';
import { ISwaggerProjectRepository } from '../swagger/swagger-project.repository';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, number[]>();

  constructor(
    @Inject(PROJECT_REPO) private readonly projectRepo: ISwaggerProjectRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const projectId: string = req.params['projectId'];

    const project = await this.projectRepo.findById(projectId);
    if (!project?.rateLimit?.enabled) return true;

    const { requestsPerMinute } = project.rateLimit;
    const windowMs = 60_000;
    const now = Date.now();

    const prev = this.windows.get(projectId) ?? [];
    const recent = prev.filter((t) => now - t < windowMs);

    const remaining = Math.max(0, requestsPerMinute - recent.length);
    const resetAt = recent.length > 0 ? recent[0] + windowMs : now + windowMs;

    res.setHeader('X-RateLimit-Limit', requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (recent.length >= requestsPerMinute) {
      const retryAfterSec = Math.ceil((resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded: maximum ${requestsPerMinute} req/min. Retry after ${retryAfterSec}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.windows.set(projectId, recent);
    return true;
  }
}

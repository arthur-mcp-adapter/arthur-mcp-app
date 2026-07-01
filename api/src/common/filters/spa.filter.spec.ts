import { NotFoundException, ArgumentsHost } from '@nestjs/common';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

import { existsSync } from 'fs';
import { SpaFilter } from './spa.filter';
import type { ErrorTrackingService } from '../../error-tracking/error-tracking.service';

const makeHost = (path: string) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    sendFile: jest.fn(),
  };
  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => ({ path }),
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost,
    res,
  };
};

describe('SpaFilter', () => {
  const errorTracking: jest.Mocked<Pick<ErrorTrackingService, 'captureBackendError'>> = {
    captureBackendError: jest.fn(),
  };
  let filter: SpaFilter;

  beforeEach(() => {
    filter = new SpaFilter(errorTracking as unknown as ErrorTrackingService);
    jest.clearAllMocks();
  });

  it('returns 404 JSON for /api paths even when index.html exists', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const { host, res } = makeHost('/api/users');
    filter.catch(new NotFoundException(), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalled();
    expect(res.sendFile).not.toHaveBeenCalled();
    expect(errorTracking.captureBackendError).toHaveBeenCalledWith(expect.objectContaining({
      source: 'http_request',
      statusCode: 404,
    }));
  });

  it('returns 404 JSON for /mcp paths', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const { host, res } = makeHost('/mcp/tools');
    filter.catch(new NotFoundException(), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 JSON for /health', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const { host, res } = makeHost('/health');
    filter.catch(new NotFoundException(), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 JSON for /mcp-docs', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const { host, res } = makeHost('/mcp-docs');
    filter.catch(new NotFoundException(), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('serves index.html for /dashboard when file exists', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const { host, res } = makeHost('/dashboard');
    filter.catch(new NotFoundException(), host);
    expect(res.sendFile).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(errorTracking.captureBackendError).not.toHaveBeenCalled();
  });

  it('returns 404 JSON for unknown SPA routes when index.html is missing', () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    const { host, res } = makeHost('/dashboard');
    filter.catch(new NotFoundException(), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.sendFile).not.toHaveBeenCalled();
  });
});

import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { McpExceptionFilter } from './mcp-exception.filter';
import type { ErrorTrackingService } from '../../error-tracking/error-tracking.service';

const makeHost = (path: string, body?: Record<string, unknown>, headersSent = false) => {
  const res = {
    headersSent,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const req = {
    path,
    method: 'POST',
    originalUrl: path,
    ip: '127.0.0.1',
    body,
  };
  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost,
    req,
    res,
  };
};

describe('McpExceptionFilter', () => {
  const errorTracking: jest.Mocked<Pick<ErrorTrackingService, 'captureBackendError'>> = {
    captureBackendError: jest.fn(),
  };
  let filter: McpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new McpExceptionFilter(errorTracking as unknown as ErrorTrackingService);
  });

  it('captures and returns regular HTTP errors', () => {
    const { host, req, res } = makeHost('/api/users');

    filter.catch(new BadRequestException('Invalid input'), host);

    expect(errorTracking.captureBackendError).toHaveBeenCalledWith(expect.objectContaining({
      source: 'http_request',
      request: req,
      statusCode: 400,
    }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid input' });
  });

  it('captures and maps MCP errors to JSON-RPC responses', () => {
    const { host, req, res } = makeHost('/mcp/server-1', { id: 7, params: { name: 'list_users' } });

    filter.catch(new Error('Tool exploded'), host);

    expect(errorTracking.captureBackendError).toHaveBeenCalledWith(expect.objectContaining({
      source: 'mcp_request',
      request: req,
      statusCode: 500,
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      jsonrpc: '2.0',
      id: 7,
      error: expect.objectContaining({ message: 'Tool exploded' }),
    }));
  });

  it('captures errors even when response headers are already sent', () => {
    const { host, res } = makeHost('/api/users', undefined, true);

    filter.catch(new Error('Late failure'), host);

    expect(errorTracking.captureBackendError).toHaveBeenCalledWith(expect.objectContaining({
      source: 'http_request',
      statusCode: 500,
    }));
    expect(res.status).not.toHaveBeenCalled();
  });
});

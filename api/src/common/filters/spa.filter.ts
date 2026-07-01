import { ExceptionFilter, Catch, NotFoundException, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { ErrorTrackingService } from '../../error-tracking/error-tracking.service';

const INDEX_HTML = join(__dirname, '..', '..', 'public', 'index.html');

const API_PREFIXES = ['/api', '/mcp', '/health', '/mcp-docs'];

@Catch(NotFoundException)
export class SpaFilter implements ExceptionFilter {
  constructor(private readonly errorTracking?: ErrorTrackingService) {}

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const req  = ctx.getRequest<Request>();
    const res  = ctx.getResponse<Response>();

    const isApiPath = API_PREFIXES.some((p) => req.path.startsWith(p));
    if (isApiPath) {
      this.errorTracking?.captureBackendError({
        error: exception,
        source: req.path.startsWith('/mcp') ? 'mcp_request' : 'http_request',
        request: req,
        statusCode: 404,
      });
    }

    if (!isApiPath && existsSync(INDEX_HTML)) {
      res.sendFile(INDEX_HTML);
    } else {
      res.status(404).json(exception.getResponse());
    }
  }
}

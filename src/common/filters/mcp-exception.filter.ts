import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

const RPC_CODES = {
  validation: -32602,
  not_found: -32004,
  timeout: -32008,
  generic: -32000,
};

function mapErrorCode(err: unknown): { code: number; reason: string } {
  if (err instanceof HttpException) {
    const status = err.getStatus();
    if (status === HttpStatus.BAD_REQUEST) return { code: RPC_CODES.validation, reason: 'validation' };
    if (status === HttpStatus.NOT_FOUND) return { code: RPC_CODES.not_found, reason: 'not_found' };
    if (status === HttpStatus.REQUEST_TIMEOUT) return { code: RPC_CODES.timeout, reason: 'timeout' };
  }

  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('validation') || msg.includes('invalid')) {
    return { code: RPC_CODES.validation, reason: 'validation' };
  }

  return { code: RPC_CODES.generic, reason: 'internal_error' };
}

@Catch()
export class McpExceptionFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // @rekog/mcp-nest handles its own responses; skip if already sent
    if (res.headersSent) return;

    // Rotas não-MCP retornam HTTP padrão
    if (!req.path.startsWith('/mcp')) {
      const status = err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        err instanceof HttpException
          ? ((err.getResponse() as any)?.message ?? err.message)
          : 'Internal server error';
      res.status(status).json({ message });
      return;
    }

    const body = req.body as Record<string, any>;
    const id = body?.id ?? null;
    const toolName = body?.params?.name ?? undefined;

    const { code, reason } = mapErrorCode(err);

    const message =
      err instanceof HttpException
        ? (err.getResponse() as any)?.message ?? err.message
        : err instanceof Error
        ? err.message
        : 'An unexpected error occurred';

    res.status(200).json({
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data: {
          ...(toolName && { tool: toolName }),
          reason,
        },
      },
    });
  }
}

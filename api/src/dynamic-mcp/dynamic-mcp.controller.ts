import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { DEFAULT_NEGOTIATED_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { DynamicMcpService } from './dynamic-mcp.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { ProjectStateGuard } from './project-state.guard';

/**
 * The MCP SDK's JSON-RPC parser requires "jsonrpc": "2.0" and "id" on every
 * request, and its `initialize` handler requires `params.protocolVersion`,
 * `params.capabilities`, and `params.clientInfo` — but some AI/agent clients
 * send bare messages like `{ "method": "initialize" }` with none of that.
 * Missing "jsonrpc" fails parsing outright (400 Parse error). Missing "id" is
 * worse: the message still matches the SDK's notification shape, so it's
 * silently reclassified as one and gets an empty 202 — no body, no error —
 * for every method, including initialize/tools-list. Missing/incomplete
 * `initialize` params fail the SDK's internal schema check and produce a
 * real but unhelpful JSON-RPC error instead of a handshake. Backfill all of
 * it before the SDK ever sees the message, for anything that isn't a real
 * notification.
 */
export function normalizeJsonRpcBody(body: unknown): unknown {
  const normalize = (msg: unknown) => {
    if (
      !msg ||
      typeof msg !== 'object' ||
      typeof (msg as any).method !== 'string' ||
      (msg as any).method.startsWith('notifications/')
    ) {
      return msg;
    }
    const m = msg as Record<string, unknown>;
    const normalized: Record<string, unknown> = { jsonrpc: '2.0', ...m, id: m.id ?? randomUUID() };

    if (normalized.method === 'initialize') {
      const p = normalized.params && typeof normalized.params === 'object'
        ? (normalized.params as Record<string, unknown>)
        : {};
      const clientInfo = p.clientInfo as Record<string, unknown> | undefined;
      normalized.params = {
        ...p,
        protocolVersion: typeof p.protocolVersion === 'string' ? p.protocolVersion : DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
        capabilities: p.capabilities ?? {},
        clientInfo: typeof clientInfo?.name === 'string' && typeof clientInfo?.version === 'string'
          ? clientInfo
          : { name: 'unknown-client', version: '0.0.0' },
      };
    }

    return normalized;
  };
  return Array.isArray(body) ? body.map(normalize) : normalize(body);
}

/**
 * Per-project MCP endpoint — stateless Streamable HTTP.
 * URL: /mcp/server/:serverId
 *
 * Supports MCP clients (Claude Desktop, Cursor, etc.) using:
 *   POST   /mcp/server/:serverId   → ListTools / CallTool
 *   GET    /mcp/server/:serverId   → SSE (connectivity ping)
 *   DELETE /mcp/server/:serverId   → End session (no-op in stateless mode)
 */
@Controller('mcp/server')
export class DynamicMcpController {
  constructor(private readonly dynamicMcpService: DynamicMcpService) {}

  /**
   * Simple REST endpoint for testing a tool directly from the frontend.
   * Calls baseUrl + external endpoint without going through the MCP protocol.
   * POST /mcp/server/:serverId/execute/:toolName
   * Body: { arguments: { param1: value1, ... } }
   */
  @Post(':serverId/execute/:toolName')
  @HttpCode(200)
  async executeToolDirect(
    @Param('serverId') serverId: string,
    @Param('toolName') toolName: string,
    @Body('arguments') args: Record<string, unknown>,
  ) {
    return this.dynamicMcpService.executeTool(serverId, toolName, args ?? {});
  }

  @UseGuards(ProjectStateGuard, McpApiKeyGuard, RateLimitGuard)
  @Post(':serverId')
  @HttpCode(200)
  async handlePost(
    @Param('serverId') serverId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const queryParams = (req as any).query as Record<string, string>;
    const server = await this.dynamicMcpService.createMcpServer(serverId, queryParams);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res, normalizeJsonRpcBody(req.body));
  }

  @UseGuards(ProjectStateGuard, McpApiKeyGuard, RateLimitGuard)
  @Get(':serverId')
  async handleGet(
    @Param('serverId') serverId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const queryParams = (req as any).query as Record<string, string>;
    const server = await this.dynamicMcpService.createMcpServer(serverId, queryParams);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res);
  }

  @UseGuards(McpApiKeyGuard, RateLimitGuard)
  @Delete(':serverId')
  @HttpCode(200)
  async handleDelete(
    @Param('serverId') serverId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const queryParams = (req as any).query as Record<string, string>;
    const server = await this.dynamicMcpService.createMcpServer(serverId, queryParams);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res);
  }
}

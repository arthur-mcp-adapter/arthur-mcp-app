import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import type { Request } from 'express'
import { ERROR_TRACKING_PROVIDER_REPO } from '../database/database.tokens'
import type { IErrorTrackingProviderRepository, ErrorTrackingProviderRecord } from './error-tracking-provider.repository'
import type { CreateErrorTrackingProviderDto } from './dto/create-error-tracking-provider.dto'
import type { UpdateErrorTrackingProviderDto } from './dto/update-error-tracking-provider.dto'

export interface ToolErrorContext {
  serverId: string
  serverName: string
  toolName: string
  error: Error | unknown
}

export interface BackendErrorContext {
  error: Error | unknown
  source: 'http_request' | 'mcp_request' | 'mcp_tool' | 'process'
  request?: Request
  statusCode?: number
  tags?: Record<string, string | number | boolean | undefined>
  extras?: Record<string, unknown>
}

export interface ErrorTrackingProviderResponse {
  id: string
  name: string
  description?: string
  tool: string
  projectName?: string
  environment?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name)
  private activeRecord: ErrorTrackingProviderRecord | null = null

  constructor(
    @Inject(ERROR_TRACKING_PROVIDER_REPO)
    private readonly repo: IErrorTrackingProviderRepository,
  ) {}

  async onModuleInit() {
    await this.reinitialize()
  }

  private toResponse(record: ErrorTrackingProviderRecord): ErrorTrackingProviderResponse {
    const { dsn: _dsn, ...rest } = record
    return rest
  }

  private async reinitialize() {
    try {
      this.activeRecord = await this.repo.findActive()
      if (this.activeRecord) {
        Sentry.init({
          dsn: this.activeRecord.dsn,
          environment: this.activeRecord.environment ?? 'production',
          release: this.activeRecord.projectName ?? undefined,
          integrations: [],
          tracesSampleRate: 0,
          defaultIntegrations: false,
        })
        this.logger.log(`Sentry initialized for provider "${this.activeRecord.name}"`)
      } else {
        await Sentry.close()
        this.logger.log('Sentry deactivated — no active provider')
      }
    } catch (err) {
      this.logger.warn(`Failed to reinitialize Sentry: ${err}`)
    }
  }

  captureToolError(ctx: ToolErrorContext): void {
    this.captureBackendError({
      error: ctx.error,
      source: 'mcp_tool',
      tags: {
        mcp_server_id: ctx.serverId,
        mcp_server_name: ctx.serverName,
        mcp_tool_name: ctx.toolName,
      },
    })
  }

  captureBackendError(ctx: BackendErrorContext): void {
    if (!this.activeRecord) return
    try {
      Sentry.withScope((scope) => {
        scope.setTag('backend_error_source', ctx.source)
        if (ctx.statusCode) scope.setTag('http_status_code', ctx.statusCode)
        for (const [key, value] of Object.entries(ctx.tags ?? {})) {
          if (value !== undefined) scope.setTag(key, value)
        }

        if (ctx.request) {
          const user = (ctx.request as any).user as { userId?: string; username?: string; role?: string } | undefined
          scope.setTag('http_method', ctx.request.method)
          scope.setTag('http_path', ctx.request.path)
          if (user?.userId) scope.setUser({ id: user.userId, username: user.username })
          if (user?.role) scope.setTag('user_role', user.role)
          scope.setExtra('request', {
            method: ctx.request.method,
            path: ctx.request.path,
            originalUrl: ctx.request.originalUrl,
            ip: ctx.request.ip,
          })
        }

        for (const [key, value] of Object.entries(ctx.extras ?? {})) {
          scope.setExtra(key, value)
        }
        scope.setExtra('environment', this.activeRecord!.environment ?? 'production')
        Sentry.captureException(ctx.error instanceof Error ? ctx.error : new Error(String(ctx.error)))
      })
    } catch (err) {
      this.logger.warn(`Sentry capture failed: ${err}`)
    }
  }

  async findAll(): Promise<ErrorTrackingProviderResponse[]> {
    const records = await this.repo.findAll()
    return records.map(this.toResponse.bind(this))
  }

  async findById(id: string): Promise<ErrorTrackingProviderResponse> {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundException(`Error tracking provider ${id} not found`)
    return this.toResponse(record)
  }

  async revealDsn(id: string): Promise<{ dsn: string }> {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundException(`Error tracking provider ${id} not found`)
    return { dsn: record.dsn }
  }

  async create(dto: CreateErrorTrackingProviderDto): Promise<ErrorTrackingProviderResponse> {
    if (dto.isActive) {
      await this.repo.deactivateAll()
    }
    const record = await this.repo.create({
      name: dto.name,
      description: dto.description,
      tool: dto.tool,
      dsn: dto.dsn,
      projectName: dto.projectName,
      environment: dto.environment,
      isActive: dto.isActive ?? false,
    })
    await this.reinitialize()
    return this.toResponse(record)
  }

  async update(id: string, dto: UpdateErrorTrackingProviderDto): Promise<ErrorTrackingProviderResponse> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Error tracking provider ${id} not found`)
    if (dto.isActive === true) {
      await this.repo.deactivateAll()
    }
    const record = await this.repo.update(id, dto)
    await this.reinitialize()
    return this.toResponse(record!)
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id)
    if (!deleted) throw new NotFoundException(`Error tracking provider ${id} not found`)
    await this.reinitialize()
  }

  async simulateError(
    id: string,
    dto?: { message?: string; level?: string },
  ): Promise<{ ok: boolean; eventId?: string; error?: string }> {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundException(`Error tracking provider ${id} not found`)
    if (!this.activeRecord || this.activeRecord.id !== record.id) {
      return { ok: false, error: 'Provider is not active. Activate it before sending a test event.' }
    }
    try {
      const message = dto?.message?.trim() || 'Test error from Arthur MCP Adapter'
      const testError = new Error(message)
      testError.name = 'SentryTestError'
      const level = (dto?.level as Sentry.SeverityLevel | undefined) ?? 'error'
      const eventId = Sentry.withScope((scope) => {
        scope.setLevel(level)
        scope.setTag('simulated', 'true')
        return Sentry.captureException(testError)
      })
      await Sentry.flush(3000)
      this.logger.log(`Sentry test event sent for provider "${record.name}" — eventId: ${eventId}`)
      return { ok: true, eventId }
    } catch (err: any) {
      this.logger.warn(`Sentry simulate error failed: ${err}`)
      return { ok: false, error: err?.message ?? String(err) }
    }
  }

  async testConnection(id: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const record = await this.repo.findById(id)
    if (!record) throw new NotFoundException(`Error tracking provider ${id} not found`)
    const start = Date.now()
    try {
      // Initialize a temporary client to validate the DSN
      Sentry.init({
        dsn: record.dsn,
        environment: record.environment ?? 'test',
        integrations: [],
        tracesSampleRate: 0,
        defaultIntegrations: false,
      })
      Sentry.captureMessage('Arthur MCP Adapter — connection test', 'info')
      await Sentry.flush(3000)
      // Restore from active record
      await this.reinitialize()
      return { ok: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      await this.reinitialize()
      return { ok: false, latencyMs: Date.now() - start, error: err?.message ?? String(err) }
    }
  }
}

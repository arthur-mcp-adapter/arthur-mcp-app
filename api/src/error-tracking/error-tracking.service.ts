import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as Sentry from '@sentry/node'
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
    if (!this.activeRecord) return
    try {
      Sentry.withScope((scope) => {
        scope.setTag('mcp_server_id', ctx.serverId)
        scope.setTag('mcp_server_name', ctx.serverName)
        scope.setTag('mcp_tool_name', ctx.toolName)
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

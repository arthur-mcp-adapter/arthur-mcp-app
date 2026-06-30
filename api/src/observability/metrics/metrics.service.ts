import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';
import { PROMETHEUS_REGISTRY } from './prometheus.registry';

interface HttpMetricLabels extends Record<string, string> {
  method: string;
  route: string;
  status_code: string;
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private initialized = false;
  private readonly enabled: boolean;
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly version: string;

  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsErrorsTotal: Counter<string>;
  private readonly mcpToolCallsTotal: Counter<string>;
  private readonly mcpToolErrorsTotal: Counter<string>;
  private readonly mcpToolDuration: Histogram<string>;
  private readonly mcpResourceReadsTotal: Counter<string>;
  private readonly mcpResourceErrorsTotal: Counter<string>;
  private readonly mcpPromptCallsTotal: Counter<string>;
  private readonly mcpExternalHttpRequestsTotal: Counter<string>;
  private readonly mcpExternalHttpErrorsTotal: Counter<string>;
  private readonly mcpExternalHttpDuration: Histogram<string>;

  constructor(
    @Inject(PROMETHEUS_REGISTRY) private readonly registry: Registry,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<string>('ENABLE_METRICS', process.env.ENABLE_METRICS ?? 'true') !== 'false';
    this.serviceName = this.configService.get<string>('SERVICE_NAME', process.env.SERVICE_NAME ?? 'arthur-mcp-adapter');
    this.environment = this.configService.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'development');
    this.version = this.configService.get<string>('SERVICE_VERSION', process.env.SERVICE_VERSION ?? '1.0.0');

    this.registry.setDefaultLabels({
      service: this.serviceName,
      environment: this.environment,
      version: this.version,
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.httpRequestsErrorsTotal = new Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP requests completed with 4xx or 5xx status codes.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.mcpToolCallsTotal = new Counter({
      name: 'mcp_tool_calls_total',
      help: 'Total MCP tool calls.',
      labelNames: ['tool_name', 'status', 'transport'],
      registers: [this.registry],
    });
    this.mcpToolErrorsTotal = new Counter({
      name: 'mcp_tool_errors_total',
      help: 'Total MCP tool call errors.',
      labelNames: ['tool_name', 'status', 'transport'],
      registers: [this.registry],
    });
    this.mcpToolDuration = new Histogram({
      name: 'mcp_tool_duration_seconds',
      help: 'MCP tool call duration in seconds.',
      labelNames: ['tool_name', 'status', 'transport'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.registry],
    });
    this.mcpResourceReadsTotal = new Counter({
      name: 'mcp_resource_reads_total',
      help: 'Total MCP resource reads.',
      labelNames: ['resource_name', 'status'],
      registers: [this.registry],
    });
    this.mcpResourceErrorsTotal = new Counter({
      name: 'mcp_resource_errors_total',
      help: 'Total MCP resource read errors.',
      labelNames: ['resource_name', 'status'],
      registers: [this.registry],
    });
    this.mcpPromptCallsTotal = new Counter({
      name: 'mcp_prompt_calls_total',
      help: 'Total MCP prompt calls.',
      labelNames: ['prompt_name', 'status'],
      registers: [this.registry],
    });
    this.mcpExternalHttpRequestsTotal = new Counter({
      name: 'mcp_external_http_requests_total',
      help: 'Total external HTTP requests issued by MCP tools and resources.',
      labelNames: ['provider', 'status', 'status_code'],
      registers: [this.registry],
    });
    this.mcpExternalHttpErrorsTotal = new Counter({
      name: 'mcp_external_http_errors_total',
      help: 'Total external HTTP request errors issued by MCP tools and resources.',
      labelNames: ['provider', 'status', 'status_code'],
      registers: [this.registry],
    });
    this.mcpExternalHttpDuration = new Histogram({
      name: 'mcp_external_http_duration_seconds',
      help: 'External HTTP request duration in seconds for MCP tools and resources.',
      labelNames: ['provider', 'status', 'status_code'],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    if (!this.enabled || this.initialized) return;
    collectDefaultMetrics({
      register: this.registry,
      eventLoopMonitoringPrecision: 10,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
    this.initialized = true;
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async renderMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHttpRequest(labels: HttpMetricLabels, durationSeconds: number): void {
    if (!this.enabled) return;
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
    if (Number(labels.status_code) >= 400) this.httpRequestsErrorsTotal.inc(labels);
  }

  recordMcpTool(params: { toolName: string; durationSeconds: number; status: string; transport: string; isError?: boolean }): void {
    if (!this.enabled) return;
    const labels = { tool_name: params.toolName, status: params.status, transport: params.transport };
    this.mcpToolCallsTotal.inc(labels);
    this.mcpToolDuration.observe(labels, params.durationSeconds);
    if (params.isError) this.mcpToolErrorsTotal.inc(labels);
  }

  recordMcpResource(params: { resourceName: string; status: string; isError?: boolean }): void {
    if (!this.enabled) return;
    const labels = { resource_name: params.resourceName, status: params.status };
    this.mcpResourceReadsTotal.inc(labels);
    if (params.isError) this.mcpResourceErrorsTotal.inc(labels);
  }

  recordMcpPrompt(params: { promptName: string; status: string }): void {
    if (!this.enabled) return;
    this.mcpPromptCallsTotal.inc({ prompt_name: params.promptName, status: params.status });
  }

  recordExternalHttp(params: { provider: string; status: string; statusCode: string | number; durationSeconds: number; isError?: boolean }): void {
    if (!this.enabled) return;
    const labels = {
      provider: params.provider,
      status: params.status,
      status_code: String(params.statusCode),
    };
    this.mcpExternalHttpRequestsTotal.inc(labels);
    this.mcpExternalHttpDuration.observe(labels, params.durationSeconds);
    if (params.isError) this.mcpExternalHttpErrorsTotal.inc(labels);
  }
}

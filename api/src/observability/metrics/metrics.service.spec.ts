import { ConfigService } from '@nestjs/config';
import { Registry } from 'prom-client';
import { MetricsService } from './metrics.service';
import { PROMETHEUS_REGISTRY } from './prometheus.registry';
import { MetricsController } from '../metrics.controller';

function config(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string, fallback?: string) => overrides[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService(new Registry(), config({
      ENABLE_METRICS: 'true',
      ENABLE_OBSERVABILITY: 'true',
      SERVICE_NAME: 'arthur-mcp-adapter',
      SERVICE_VERSION: '1.0.0',
      NODE_ENV: 'test',
    }));
  });

  it('renders Prometheus metrics for the metrics endpoint', async () => {
    const controller = new MetricsController(service);
    service.recordHttpRequest({ method: 'GET', route: '/health', status_code: '200' }, 0.012);

    await expect(controller.metrics()).resolves.toContain('http_requests_total');
  });

  it('records HTTP request totals, errors, and duration', async () => {
    service.recordHttpRequest({ method: 'GET', route: '/missing', status_code: '404' }, 0.05);
    const metrics = await service.renderMetrics();

    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_requests_errors_total');
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('status_code="404"');
  });

  it('records MCP tool, resource, prompt, and external HTTP metrics', async () => {
    service.recordMcpTool({ toolName: 'getUsers', status: 'ok', transport: 'mcp', durationSeconds: 0.2 });
    service.recordMcpTool({ toolName: 'deleteUser', status: 'error', transport: 'direct', durationSeconds: 0.3, isError: true });
    service.recordMcpResource({ resourceName: 'users', status: 'ok' });
    service.recordMcpResource({ resourceName: 'orders', status: 'error', isError: true });
    service.recordMcpPrompt({ promptName: 'summarize', status: 'ok' });
    service.recordExternalHttp({ provider: 'api.example.com', status: 'error', statusCode: 500, durationSeconds: 0.4, isError: true });

    const metrics = await service.renderMetrics();

    expect(metrics).toContain('mcp_tool_calls_total');
    expect(metrics).toContain('mcp_tool_errors_total');
    expect(metrics).toContain('mcp_resource_reads_total');
    expect(metrics).toContain('mcp_resource_errors_total');
    expect(metrics).toContain('mcp_prompt_calls_total');
    expect(metrics).toContain('mcp_external_http_requests_total');
    expect(metrics).toContain('mcp_external_http_errors_total');
    expect(metrics).toContain('tool_name="getUsers"');
  });

  it('can be provided through the Prometheus registry token', () => {
    expect(PROMETHEUS_REGISTRY).toBeDefined();
  });
});

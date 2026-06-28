import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function isTracingEnabled(): boolean {
  return process.env.ENABLE_TRACING === 'true'
    && (process.env.ENABLE_OBSERVABILITY ?? 'true') !== 'false';
}

export function initializeOpenTelemetry(): NodeSDK | undefined {
  if (!isTracingEnabled() || sdk) return sdk;

  const exporterType = process.env.OTEL_EXPORTER_TYPE ?? (process.env.NODE_ENV === 'production' ? 'otlp' : 'console');
  const traceExporter = exporterType === 'otlp'
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      })
    : new ConsoleSpanExporter();

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? process.env.SERVICE_NAME ?? 'arthur-mcp-adapter',
      [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '1.0.0',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.once('SIGTERM', () => {
    sdk?.shutdown().catch(() => undefined);
  });

  return sdk;
}

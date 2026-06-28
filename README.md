# Arthur MCP Adapter

Arthur MCP Adapter is a full-stack application for managing MCP servers, importing API definitions, generating dynamic tools, handling prompts, secrets, logs, settings, sharing, and documentation.

## Observability

The NestJS API exposes operational endpoints at:

- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /metrics`

Enable or tune observability with environment variables:

```bash
ENABLE_OBSERVABILITY=true
ENABLE_STRUCTURED_LOGS=true
ENABLE_METRICS=true
ENABLE_TRACING=false
LOG_LEVEL=info
SERVICE_NAME=arthur-mcp-adapter
SERVICE_VERSION=1.0.0
PROMETHEUS_METRICS_PATH=/metrics
OTEL_SERVICE_NAME=arthur-mcp-adapter
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_TYPE=console
```

Logs are structured JSON on stdout/stderr and include request, correlation, trace, HTTP, and error fields when available.

## Prometheus And Grafana

Run the API:

```bash
npm run start:dev --prefix api
```

Run the local observability stack:

```bash
docker compose -f observability/docker-compose.yml up
```

Prometheus: `http://localhost:9090`
Grafana: `http://localhost:3001` with `admin` / `admin`

Import `observability/grafana-dashboard.json` in Grafana and configure a Prometheus datasource pointing at `http://prometheus:9090`.

## OpenTelemetry

Console exporter for development:

```bash
ENABLE_TRACING=true
OTEL_EXPORTER_TYPE=console
```

OTLP exporter for a collector or Tempo:

```bash
ENABLE_TRACING=true
OTEL_EXPORTER_TYPE=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Tracing is optional; `ENABLE_TRACING=false` keeps the app running without a trace exporter.

## Render

The app listens on `process.env.PORT` and binds to `0.0.0.0`, which is required by Render. The included `render.yaml` configures the Docker web service on the free plan with `/health` as the health check and observability enabled by default, while tracing remains disabled until an OTLP endpoint is configured.

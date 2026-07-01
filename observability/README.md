# Observability Stack

This folder contains local Prometheus, Grafana, and Tempo helpers for Arthur MCP.

## Run Locally

Start the application first:

```bash
npm run start:dev --prefix api
```

Then start the observability stack:

```bash
docker compose -f observability/docker-compose.yml up
```

Prometheus is available at `http://localhost:9090`, Grafana at `http://localhost:3001`, and Tempo at `http://localhost:3200`.

## Metrics

Prometheus scrapes the application at `host.docker.internal:3000/metrics`. If the API runs on another port, update `observability/prometheus.yml`.

## Grafana

Import `observability/grafana-dashboard.json` into Grafana and select a Prometheus datasource. The dashboard includes request rate, errors, latency, Node.js runtime metrics, MCP tool/resource metrics, and external HTTP metrics.

## Traces

To send traces to the local Tempo service:

```bash
ENABLE_TRACING=true
OTEL_EXPORTER_TYPE=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Tracing is optional. With `ENABLE_TRACING=false`, the application starts normally without an exporter.

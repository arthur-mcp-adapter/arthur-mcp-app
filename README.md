# Arthur MCP

Arthur MCP is an open, self-hostable control plane for building and operating Model Context Protocol servers from APIs, databases, prompts, resources, and internal tools.

It helps teams turn existing systems into AI-ready MCP endpoints without hiding the underlying contracts. Import an API, shape the exposed tools, protect credentials, manage prompts and resources, monitor execution, and publish clean MCP Swagger-style documentation for clients.

## Why Arthur MCP

AI clients are most useful when they can safely act on real systems. The hard part is not just generating a tool schema. The hard part is the operational layer around it: auth, secrets, rate limits, logs, prompts, docs, public setup links, testing, and a workflow that lets humans review what an AI client can access.

Arthur MCP is designed for that layer.

- Convert OpenAPI, Swagger, Postman, REST templates, and data-source operations into MCP tools.
- Manage MCP servers with settings, auth, keys, OAuth clients, response limits, rate limits, and maintenance controls.
- Publish public MCP Swagger documentation pages through permanent, slug-based links.
- Use readable slugs for public docs and MCP runtime URLs while preserving UUID compatibility.
- Keep credentials server-side through secrets, upstream auth config, and explicit reveal flows.
- Observe runtime behavior with health checks, structured logs, Prometheus metrics, and optional OpenTelemetry tracing.

## Features

### MCP Server Management

- Create and manage multiple MCP servers.
- Import OpenAPI/Swagger specs.
- Import Postman collections.
- Start from REST templates.
- Configure base URLs, authentication, rate limits, response limits, availability windows, and maintenance mode.
- Pause or reactivate servers without deleting configuration.

### Dynamic Tools

- Generate MCP tools from imported API endpoints.
- Add or edit tools manually.
- Define input and output schemas.
- Test tools directly from the app.
- Attach notes and comments to tools.
- Build multi-step tool chains.

### Resources And Prompts

- Expose static or dynamic MCP resources.
- Link server-specific prompts to the shared prompt library.
- Manage prompt templates and arguments.
- Keep resources, prompts, tools, and operations visible in public documentation only when enabled.

### Secrets And Authentication

- Store secret values separately from metadata.
- Use secrets in upstream auth configuration.
- Manage legacy and named MCP API keys.
- Configure OAuth clients for MCP consumers.
- Rotate JWT signing secrets through Settings.

### Public MCP Swagger Pages

- Generate permanent public documentation links.
- Prefer documentation URLs like:

```text
/mcp-swagger/:serverSlug
```

- Preserve legacy signed links:

```text
/mcp-swagger/:serverSlug/:token
/share/:serverSlug/:token
/share/:token
```

- Display the MCP runtime endpoint with the server slug when available:

```text
/api/mcp/server/:serverSlug
```

- Keep UUID runtime URLs working for compatibility:

```text
/api/mcp/server/:serverId
```

### Observability

The API exposes operational endpoints:

- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /metrics`

Runtime observability includes:

- Structured JSON logs.
- Correlation IDs.
- Prometheus metrics.
- Optional OpenTelemetry tracing.
- Local Prometheus, Grafana, and Tempo helper configuration.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Material UI
- React Router
- Axios
- i18next and react-i18next
- Vitest

### Backend

- NestJS
- TypeScript
- TypeORM
- SQLite, MySQL, PostgreSQL
- MongoDB through Mongoose for supported domains
- JWT and Passport
- Jest
- Prometheus metrics
- Optional OpenTelemetry tracing

## Repository Layout

```text
.
|-- api/                 # NestJS backend
|-- src/                 # React frontend
|-- src/pages/           # Route-level screens
|-- src/features/        # Product feature modules
|-- src/components/      # Shared UI components
|-- src/context/         # Auth, navigation, terminology, theme
|-- src/locales/         # i18n resources
|-- docs/                # Architecture, flows, roadmap, handoff
|-- observability/       # Prometheus, Grafana, Tempo helpers
|-- docker-compose.yml
|-- Dockerfile
|-- nginx.conf
`-- render.yaml
```

## Quick Start

### Prerequisites

- Node.js 20 or newer is recommended.
- npm.
- Docker is optional, but useful for local infrastructure.

### Install Dependencies

```bash
npm install
npm install --prefix api
```

### Configure The Backend

Copy the example environment file:

```bash
cp api/.env.example api/.env
```

For local development, SQLite works out of the box:

```env
DATABASE=sqlite
SQLITE_PATH=database.sqlite
JWT_SECRET=dev-jwt-secret-change-in-production
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=admin
```

For production, always replace default credentials and use a long random JWT secret.

### Run Frontend And Backend

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

### Run Separately

```bash
npm run start
npm run start:dev --prefix api
```

## Useful Commands

```bash
# Frontend
npm run type-check
npm test
npm run build

# Backend
npm test --prefix api
npm run test:cov --prefix api -- --runInBand
npm run build --prefix api

# Backend e2e tests
npm run test:e2e --prefix api
```

## Docker

Build and run the full app with SQLite:

```bash
docker compose up --build
```

The app is exposed on:

```text
http://localhost
```

The default Compose setup mounts SQLite data into a Docker volume.

### Optional Databases

The backend can use:

- SQLite
- MySQL
- PostgreSQL
- MongoDB

For MySQL:

```bash
docker compose --profile mysql up --build
```

For PostgreSQL:

```bash
docker compose --profile postgres up --build
```

See `api/.env.example` for database environment variables.

## Observability

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

Run the local observability stack:

```bash
docker compose -f observability/docker-compose.yml up
```

Local tools:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Grafana login: `admin` / `admin`

Import `observability/grafana-dashboard.json` in Grafana and configure a Prometheus datasource pointing at:

```text
http://prometheus:9090
```

## Deployment

### Vercel

Vercel should deploy only the React/Vite frontend from the repository root.

Use these project settings:

```text
Root Directory: .
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Do not set Root Directory to `client`; this repository does not have a `client/` folder.

Set the backend API URL as an environment variable in Vercel:

```text
VITE_API_URL=https://your-backend.example.com/api
```

The frontend uses `VITE_API_URL` for authenticated API calls, MCP simulator requests, OAuth token exchange, and displayed backend MCP endpoints. If `VITE_API_URL` is not set, it falls back to `/api`, which is useful for local development with the Vite proxy.

### Render

This repository includes `render.yaml`.

The backend:

- Reads `process.env.PORT`.
- Binds to `0.0.0.0`.
- Uses `/health` as the Render health check.
- Enables structured logs and metrics by default.
- Keeps tracing disabled until an OTLP endpoint is configured.

### Production Notes

- Replace all development credentials.
- Generate a strong `JWT_SECRET`.
- Avoid `DB_SYNC=true` in production for MySQL or PostgreSQL.
- Use managed databases for durable production deployments.
- Protect backups for SQLite volumes if you use SQLite outside development.

## Security Model

Arthur MCP treats permissions as part of feature design.

- Backend guards are authoritative for protected API behavior.
- Frontend permission checks are used for navigation, actions, disabled states, and restricted views.
- Public operational endpoints `/health`, `/ready`, `/live`, and `/metrics` are intentionally public.
- Public MCP Swagger links are public because the slug is the access boundary. Change the slug to revoke a previously shared permanent link.
- Credentials and secret values must not be exposed through public documentation payloads.

## Documentation

Important project references:

- `docs/FLOWS.md` for user-facing flows and permission-sensitive behavior.
- `docs/ENTITIES.md` for backend domain data and persistence fields.
- `docs/DESIGN_PATTERNS.md` for backend and frontend architecture conventions.
- `docs/ROADMAP.md` for current priorities and decisions.
- `docs/HANDOFF.md` for continuity between agents and contributors.

## Contributing

Contributions are welcome.

Before opening a pull request:

1. Keep changes focused.
2. Update tests when behavior changes.
3. Update documentation when behavior, commands, setup, architecture, routes, permissions, or user flows change.
4. Run the relevant validation commands.
5. Avoid committing local database files, generated artifacts, or unrelated formatting churn.

Recommended validation:

```bash
npm run type-check
npm test
npm test --prefix api
```

## License

Arthur MCP is intended to be open and self-hostable for learning, modification, contribution, private use, internal company use, and non-commercial redistribution.

The project is distributed under MIT-style terms with an additional commercial hosting restriction: you may not sell, rent, resell, or offer Arthur MCP itself as a hosted commercial service or paid tool without explicit permission from the copyright holder.

Important note: the standard MIT License permits commercial use. Adding a restriction against rental, resale, or hosted commercial exploitation means the final license terms are not the plain OSI-approved MIT License. If you need strict OSI-approved MIT compatibility, remove the additional restriction. If you need to commercialize Arthur MCP as a service, contact the project owner for a separate commercial license.

This section is not legal advice. For formal distribution terms, add a dedicated `LICENSE` file and keep it aligned with this README.

## Project Status

Arthur MCP is actively evolving. Expect fast iteration around:

- MCP Swagger documentation.
- Dynamic tool generation.
- Database-backed operations.
- AI-assisted tool improvement.
- Observability and runtime controls.
- Frontend modularization and i18n coverage.

If you are building with Arthur MCP, small issues and focused pull requests are the best way to help the project grow.

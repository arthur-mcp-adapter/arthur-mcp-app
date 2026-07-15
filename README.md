# Arthur MCP
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/alexmmatos/arthur-mcp)

Arthur MCP is an open, self-hostable control plane for building and operating Model Context Protocol servers from APIs, databases, prompts, resources, and internal tools.

It helps teams turn existing systems into AI-ready MCP endpoints without hiding the underlying contracts. Import an API, shape the exposed tools, protect credentials, manage prompts and resources, monitor execution, and publish clean MCP Swagger-style documentation for clients.

## Why Arthur MCP

AI clients are most useful when they can safely act on real systems. The hard part is not just generating a tool schema. The hard part is the operational layer around it: auth, secrets, rate limits, logs, prompts, docs, public setup links, testing, and a workflow that lets humans review what an AI client can access.

Arthur MCP is designed for that layer.

- Convert any data-source operations into MCP tools.
- Manage MCP servers with settings, auth, keys, OAuth clients, response limits, rate limits, and maintenance controls.
- Publish public MCP Swagger documentation pages through permanent, slug-based links.
- Use readable slugs for public docs and MCP runtime URLs while preserving UUID compatibility.
- Keep credentials server-side through secrets, upstream auth config, and explicit reveal flows.
- Observe runtime behavior with health checks, structured logs, Prometheus metrics, and optional OpenTelemetry tracing.

## Features

Arthur MCP covers the full lifecycle of turning a data source into a governed MCP server — import, shape, secure, document, and observe — without leaving the browser. Below is every major feature, screenshot by screenshot.

### MCP Server Management

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/3df5fda6-d975-4812-b5f7-d9d48c74054e" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/d7a1cb0a-0f8c-45b5-bef5-c1070e7e4bd8" />

Every MCP server wraps one data source — a REST API today, with GraphQL, gRPC, and several SQL/NoSQL connectors already visible in the UI and landing next.

- Create servers from an OpenAPI/Swagger spec, a Postman collection, a REST template, or from scratch.
- Configure base URL, upstream authentication, rate limits, response size limits, availability windows, and maintenance mode per server.
- Pause a server to stop traffic instantly without losing its configuration, then reactivate it later.
- Re-import an updated API spec into an existing REST server instead of rebuilding its tools from zero.

### REST API Template Gallery

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/532b6513-a6b4-4284-bd99-6273bdf8a26d" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/a76469a0-58cc-4518-9480-f9c4584e248c" />


Skip the blank-page problem. Arthur MCP ships with **69 ready-to-use REST API templates** across AI, Business, Communication, Data, Database, Development, E-commerce, Music & Media, and Testing — GitHub, Stripe, Slack, Notion, HubSpot, OpenAI, Anthropic, Shopify, Twilio, Supabase, and dozens more.

- Pick a template, name the server, paste a credential if the API needs one — Arthur creates the server and every pre-defined tool in a single step.
- Every template ships with real descriptions, parameters, and auth wiring already filled in.
- Several templates (JSONPlaceholder, PokéAPI, Wikipedia, Open-Meteo, CoinGecko) need no credentials at all, so you can try the whole flow before connecting a real system.
- Servers created this way are tagged with the template they came from, so you can tell a template-based server apart from a hand-built one at a glance.

### Dynamic Tools

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/f7eb6ea8-663c-4d80-9f76-67c9e69098f5" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/3d6af8cf-c978-4df0-b562-68ca62475edd" />


Turn REST endpoints into MCP tools an AI client can call.

- Generate tools automatically from an imported OpenAPI/Postman endpoint.
- Add, edit, or delete tools by hand when you need full control.
- Define JSON Schema input and output for every tool.
- Test a tool directly from the app before handing it to an AI client.
- Attach notes and comments to a tool so teammates know why it exists or what changed.

### Chains (WIP)

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/a5894e0e-4e75-4494-8765-fe3ac98f92c2" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/7a2f0f57-b9bf-40cb-9fd4-9a133aac5a36" />


Compose several tools into a single multi-step MCP tool — useful when a task always requires the same sequence of calls (look up a customer, then list their invoices, for example).

- Define ordered steps, each referencing an existing tool.
- Map a step's input from the chain's own input or from an earlier step's output.
- Steps execute sequentially server-side; the AI client sees the whole chain as one ordinary tool.

### Resources

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/0a6e879b-0dc2-4d7a-b99a-1336cb5a81d2" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/e9006edd-297f-464a-a31b-39127d2fd9ed" />


Resources are the "read" half of MCP — data or documents an AI client can pull into context without calling an action.

- **Static resources** hold fixed content you write once (a policy document, a glossary, a config reference) and expose as-is.
- **Dynamic resources** are backed by a REST endpoint: Arthur calls it at read time and returns the live response, with support for input defaults and an iterator path when the upstream response is a list that should become multiple resource entries.
- Each resource declares a URI, an optional MIME type, and an error message shown to the AI client if the upstream call fails.
- Resources can be individually enabled or disabled, controlling whether they appear in MCP calls and in the public documentation page.

### Prompts

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/c5486cad-c817-416c-8596-93a58ad213d2" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/265decf2-0924-459c-9de1-c20c0a28cbb9" />


Prompts are reusable instruction templates exposed to MCP clients, so an AI assistant can pull a vetted prompt instead of everyone re-writing the same instructions by hand.

- Maintain a **shared prompt library** at `/prompts`, independent of any single server, with its own creation wizard and tags.
- **Link** any prompt from the shared library into a specific server, so the same prompt can be reused across multiple MCP servers without duplication.
- Prompts use Handlebars-style placeholders (`{{argumentName}}`) in their content; Arthur automatically detects the arguments a prompt expects and exposes them as part of its MCP contract.
- Start from a curated **Prompt Template** (`/prompt-templates`) instead of writing a prompt from scratch.
- Enable or disable a linked prompt per server, controlling whether the AI client and the public documentation page see it.

### Secrets And Authentication

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/511664ba-d909-421c-84be-95ab5c8b5c9e" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/67d52388-d8aa-4d49-ac57-f23d9f2c6976" />


- Store secret values separately from metadata, so credentials never render in list views.
- Use secrets in upstream auth configuration and reference them by name (`{{secret:NAME}}`) instead of pasting raw values into a server.
- Manage legacy and named MCP API keys.
- Configure OAuth clients for MCP consumers.
- Rotate JWT signing secrets through Settings.

### Roles & Permissions

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/e5106af9-34a8-411e-8a0f-91b4cb61d93e" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/c6af9f52-b478-4988-a5c7-c01b45616f97" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/b9f79479-d633-4e44-9fe7-e8e2fa29dc32" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/84f92346-483a-4298-9e9b-4108abf3ace9" />


Every action in Arthur MCP is gated behind an explicit permission, checked on the backend (authoritative) and mirrored on the frontend (so the UI never shows an action that will just fail afterward).

- Four **built-in roles** ship out of the box — **Administrator** (every permission), **Developer** (build and operate servers, but can't delete them or reveal secret values), **Editor** (day-to-day tool/resource/prompt work without user or role management), and **Viewer** (read-only across the board).
- Permissions are grouped by domain — Servers, Tools, Resources, Prompts, Secrets, API Keys, Users & Roles, Audit & Logs, Templates, Settings, Observability, Error Tracking, and AI Providers — each with its own view/create/edit/delete (and, where relevant, test/execute or share) actions.
- Create **custom roles** with any combination of these permissions when the four built-ins don't fit your team's structure.
- Sensitive actions get their own dedicated permission instead of riding on a broader one — for example, revealing a secret's value (`secrets_reveal_values`) is separate from just seeing that it exists, and executing an AI provider (`ai_providers_execute`, which can spend external model credits) is separate from configuring one.

### Settings

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/9127ed25-44e6-40bc-888b-c1b12213eba5" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/d4ff231e-2ca8-4c86-9902-a1846e8429d0" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/bf0c2389-fa98-4a4c-b0b2-35c755db1360" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/7c446350-0c3d-43f0-ac14-aa6d19faf7d3" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/8dcf0666-a4a5-42b7-a2af-3cfe71e4be49" />


A dedicated space for the instance-wide configuration that keeps a self-hosted deployment secure and correctly wired, gated behind its own `settings_manage` permission.

- **Server** — the base URL and default upstream request timeout used across the instance.
- **Security** — rotate the JWT signing secret used for auth tokens and public share links, without redeploying.
- **Headers** — define global request headers automatically attached to every upstream API call Arthur makes, useful for tenant IDs or infrastructure-level auth.
- **Email** — configure SMTP so the platform can send transactional email (invites, notifications).
- **Observability** — a live, read-only view of the active observability configuration (structured logs, metrics, tracing) so you can confirm what's enabled without checking environment variables directly.

### AI Providers & AI-Assisted Tooling (WIP)

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/137eb969-7167-42c7-a11c-fdfb1963b630" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/13ee6fbc-c836-4530-814c-df698f7daa39" />


Connect the LLM providers you already use and put them to work inside Arthur itself, not just as the consumer of your MCP servers.

- Store credentials for OpenAI, Anthropic, Google/Gemini, Mistral, Groq, Cohere, Azure OpenAI, Ollama, or any OpenAI-compatible custom endpoint; mark one as the default and test the connection before relying on it.
- Use AI assistance during REST server creation to improve tool names, descriptions, and schemas — turning a raw OpenAPI import into something an AI client can actually reason about.
- Provider execution (test calls, generation) is gated behind its own permission, separate from provider management, because it can consume external model credits.

### Public MCP Swagger Pages

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/7198cf26-3e3c-458e-9dfc-6ab5aefbe717" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/33167175-5681-40c2-8133-701b39b86a2c" />

Give any client — a teammate, a client integrator, or an AI agent — a clean, public reference for one server's tools, resources, and prompts, without giving them access to your dashboard.

- Generate a permanent public documentation link at `/mcp-swagger/:slug`.
- The page documents every enabled tool, resource, and prompt, including input/output schemas — never credentials or secret values.
- Revoke a previously shared link at any time by changing the server's share slug.

### Observability

<img width="1865" height="878" alt="observability" src="https://github.com/user-attachments/assets/dfb91968-54ee-4e56-9a94-f4f89cf7d62d" />
<img width="1865" height="878" alt="observability" src="https://github.com/user-attachments/assets/37f814c0-754f-4898-aca6-cf02a94d39eb" />

The API exposes operational endpoints:

- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /metrics`

Runtime observability includes:

- Structured JSON logs with correlation IDs.
- Prometheus metrics.
- Optional OpenTelemetry tracing.
- Local Prometheus, Grafana, and Tempo helper configuration, plus a ready-to-import Grafana dashboard.

### Audit Logs

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/50390f13-45ef-4d33-be7f-3db886620f19" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/f5db6032-fa35-4e8d-9654-c2c250f03c47" />


An accountability trail for everything that changes in the instance, gated behind `audit_view` (with `audit_export` for pulling the history out).

- Records who changed what across servers, tools, secrets, users, roles, and settings.
- Lets an admin or platform team answer "who touched this and when" without digging through database rows.
- Kept separate from Error Tracking on purpose: Audit Logs are about intentional changes made by people; Error Tracking is about unexpected failures at runtime.

### Error Tracking

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/0e528d88-8173-4e02-bfa3-be7d2e6d8701" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/b5fe34f1-2449-4c2f-9b85-d0d2409ad00f" />


Wires the backend into the error-monitoring provider your team already uses, instead of leaving failures to only show up in raw server logs.

- Forwards HTTP request errors, MCP tool/chain/resource/prompt execution failures, and uncaught process-level exceptions.
- Reports failures with useful context (route, error source, status code) so they're actionable from the provider's dashboard.
- Intentionally never forwards request bodies, cookies, authorization headers, API keys, DSNs, or secret values — the goal is visibility into failures, not a second place your credentials could leak from.
- Managed like any other integration, with its own `error_tracking_view` / `create` / `edit` / `delete` permissions.

### Multi-Language & Custom Terminology

Arthur MCP ships with English and Portuguese (pt-BR) translations out of the box, and lets you rename the core vocabulary (Server, Tool, Resource, and more) to match your team's own language, without touching the underlying API contracts.

### Harness

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/42d88b39-6026-4b8f-8529-75a59a800595" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/e239cc9c-d519-417a-b8bd-d8cf709661d9" />


Harness is where you'll tune how Arthur behaves when a tool call to your upstream API is slow or unreliable. The configuration UI and persistence already exist; what's still landing is the runtime enforcement inside tool execution itself. It's listed here, honestly labeled, so you know exactly what to expect today.

- **Timeout Settings** — per-tool or server-wide timeout limits so a slow upstream API can't stall the AI's response indefinitely.
- **Retry Policy** — how many times a failed call should be retried, with which backoff strategy, and for which HTTP error codes.
- **Execution Hooks** — custom logic that runs before and after a tool call, to inject headers, transform inputs, log results, or trigger side effects without touching the upstream API itself.

### Guard Rails

<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/a4e992cf-567f-4ece-ae8b-22b37cb6d0cd" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/1fc31ad4-745a-416c-ae76-4163a566f3a9" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/c7d7c4a4-bc99-4efe-873d-7d26a7a0928b" />
<img width="1865" height="878" alt="image" src="https://github.com/user-attachments/assets/9be51963-e4cd-4ebd-a013-9ab84b873c28" />


Guard Rails is the safety layer that constrains what the AI is allowed to send and receive through a server's tools. Like Harness, the configuration screens and persistence are live today; the enforcement path inside tool execution is still being connected, so treat this as a preview of where the safety model is headed rather than an active control yet.

- **Input Constraints** — validate or reject tool call parameters before they reach the upstream API: block forbidden values, enforce allowed ranges, or require specific formats.
- **Output Filtering** — scrub sensitive data from tool responses before they reach the AI: mask PII, redact secrets, or strip fields the model should never see.
- **Tool Restrictions** — restrict which tools can be called under certain conditions, by user role, time of day, rate limit, or a custom rule.

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
- SQLite, MySQL, PostgreSQL (driver auto-detected from `DATABASE_URI`)
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
DATABASE_URI=sqlite:database.sqlite
JWT_SECRET=dev-jwt-secret-change-in-production
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=admin
```

To use PostgreSQL or MySQL instead, point `DATABASE_URI` at a connection string — the driver is
detected automatically from the scheme:

```env
DATABASE_URI=postgres://mcp:mcppassword@localhost:5432/mcp_db
# or
DATABASE_URI=mysql://mcp:mcppassword@localhost:3306/mcp_db
```

For production, always replace default credentials and use a long random JWT secret.

Database schema and persisted data-shape changes are managed through migrations only. TypeORM
`synchronize` is disabled for SQLite, PostgreSQL, and MySQL; do not use startup sync or manual
database edits as the delivery path for schema changes. Pending migrations run during backend
startup and block startup if they fail.

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

For MySQL:

```bash
docker compose --profile mysql up --build
```

For PostgreSQL:

```bash
docker compose --profile postgres up --build
```

See `api/.env.example` for database environment variables.


## Deployment

### Render

This repository includes `render.yaml`.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/alexmmatos/arthur-mcp)

The backend:

- Reads `process.env.PORT`.
- Uses `/health` as the Render health check.
- Enables structured logs and metrics by default.
- Keeps tracing disabled until an OTLP endpoint is configured.

### Production Notes

- Replace all development credentials.
- Generate a strong `JWT_SECRET`.
- Keep TypeORM `synchronize` disabled and ship database changes through migrations.
- Use managed databases for durable production deployments.
- Protect backups for SQLite volumes if you use SQLite outside development.

## Security Model

Arthur MCP treats permissions as part of feature design.

- Backend guards are authoritative for protected API behavior.
- Frontend permission checks are used for navigation, actions, disabled states, and restricted views.
- Public operational endpoints `/health`, `/ready`, `/live`, and `/metrics` are intentionally public.
- Public MCP Swagger links are public because the slug is the access boundary. Change the slug to revoke a previously shared permanent link.
- Credentials and secret values must not be exposed through public documentation payloads.

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
## Found this app on Mseep.ai
[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/alexmmatos-arthur-mcp-badge.png)](https://mseep.ai/app/alexmmatos-arthur-mcp)

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

# Flows

This document records user-facing workflows that are important for agents to preserve. Update it whenever a change affects user journeys, permission-sensitive UI behavior, loading/error states, or API behavior visible to users.

## Secrets Vault

Goal: let authorized users manage named secret references without exposing sensitive values unnecessarily.

Entry points:

- `/secrets`
- `/secrets/:id`
- `SecretAutocomplete` in server/template configuration flows

Permissions:

- `secrets_view_names`: can list and read secret metadata.
- `secrets_reveal_values`: can reveal/copy secret values through the dedicated value endpoint.
- `secrets_create`: can create secrets.
- `secrets_edit`: can update metadata and values.
- `secrets_delete`: can delete secrets.

Backend behavior:

- `GET /api/secrets` returns metadata only.
- `GET /api/secrets/:id` returns metadata only.
- `GET /api/secrets/:id/value` returns `{ value }` and requires `secrets_reveal_values`.
- `POST /api/secrets` and `PATCH /api/secrets/:id` return metadata only.

Frontend behavior:

- The list page displays masked values by default.
- Reveal/copy actions request the value lazily from `/api/secrets/:id/value`.
- Users without reveal permission can still see names/descriptions when they have `secrets_view_names`, but cannot retrieve values.
- Secret references use `{{secret:NAME}}` and do not require exposing the underlying value.

Risk to preserve:

- Do not reintroduce secret values into list/detail metadata responses.
- Do not rely on frontend checks alone; backend permission guards are authoritative.

## Language and Terminology

Goal: let users view the app in a supported language and customize core MCP domain labels without changing code.

Entry points:

- Global language control in the app shell.
- `/settings` terminology section.

Backend behavior:

- `GET /api/settings` returns optional terminology override fields: `termServer`, `termTool`, `termResource`, `termPrompt`, `termChain`, and `termSecret`.
- Settings persistence stores the same fields in both SQLite and MongoDB models.
- `PATCH /api/settings` accepts `null` or empty-equivalent terminology values to return that term to the locale default.

Frontend behavior:

- `src/i18n.ts` initializes i18next with `en` and `pt-BR` resources.
- Language detection checks `localStorage.lang` first, then the browser navigator language, and falls back to English.
- Translation resources are grouped by namespace under `src/locales/<locale>/`.
- `TerminologyProvider` loads saved terminology after a token is present.
- `useTerm()` returns a saved terminology override when present, otherwise the active locale default from `common.terms`.
- Saving terminology in Settings reloads the terminology context so labels can update without a full page reload.
- Settings uses the same contextual tab navigation pattern as server/detail pages. The tabs are Server, Security, Headers, E-mail, and Terminology; each tab places its primary save action in the same footer position, while Terminology still calls its dedicated terminology save flow.
- The Settings page includes a Security section for configuring the JWT signing secret. Saving it requires `settings_manage`; safe settings reads expose only `jwtSecretSet`, never the secret value. The backend falls back to `JWT_SECRET` from the process environment when no database value is saved.
- Rotating the JWT secret invalidates existing signed sessions, OAuth/MCP bearer tokens, and share links because token verification immediately uses the saved value.

Risk to preserve:

- Do not hardcode new user-facing strings on pages that already use i18n.
- Keep translation keys in English even when locale values are translated.
- Keep configurable terms limited to domain labels; do not use terminology overrides for complete sentences.

## Observability Runtime

Goal: let authorized operators verify the technical observability layer that the backend exposes: health probes, Prometheus metrics, structured logs, correlation IDs, and optional OpenTelemetry tracing.

Entry points:

- `/observability`

Permissions:

- `observability_view`: can view the Observability runtime page.
- `settings_manage`: can save the persisted environment-control draft shown on the Observability page. Operators without this permission can still view and copy the values.

Backend behavior:

- `GET /health`, `GET /ready`, `GET /live`, and `GET /metrics` are public operational endpoints outside the `/api` prefix.
- The operational endpoints do not mutate user data and are intended for infrastructure probes and Prometheus scraping.
- Logs are emitted to stdout/stderr as structured JSON when `ENABLE_STRUCTURED_LOGS=true`.
- Metrics include Node.js defaults, HTTP request metrics, and MCP-specific metrics for tools, resources, prompts, and external HTTP.
- Tracing is optional and controlled by `ENABLE_TRACING`, `OTEL_EXPORTER_TYPE`, and `OTEL_EXPORTER_OTLP_ENDPOINT`.

Frontend behavior:

- The Observability page checks `/health`, `/ready`, `/live`, and `/metrics` directly from the browser instead of calling provider CRUD APIs.
- The page summarizes a small Prometheus sample, including HTTP request/error counts, MCP tool counters, external HTTP counters, memory, event loop lag, and uptime when present.
- The page lets operators customize an environment variable draft that matches the backend observability implementation. Boolean variables use switches, enum-like variables use selects, and free-form variables use text inputs. These controls are persisted in the global Settings singleton as `observabilityEnvironment` and can be copied as `.env` lines; they do not mutate the already-running backend process.
- The page lists the local Prometheus/Grafana/Tempo stack command that matches the backend observability implementation.
- Legacy provider creation/detail routes under `/observability/new` and `/observability/:id` redirect back to `/observability`.

Risk to preserve:

- Do not reintroduce provider-management UI unless matching backend endpoints and permission decisions exist.
- Do not require authentication for the operational probe endpoints themselves; the UI page is permission-gated, but infrastructure probes stay public.
- Keep the page focused on technical observability. Do not add AI insight, automatic log analysis, or Grafana Cloud coupling here.

## REST Server Templates

Goal: let users create a preconfigured REST server from a template while preserving source-type filtering and source-specific behavior.

Entry points:

- `/templates`

Backend behavior:

- `POST /api/swagger/servers` accepts optional `tags` when creating an empty server.
- Template-created servers must include `source:rest` in `tags`.
- Source-aware backend logic reads the first `source:<type>` tag and falls back to `rest` when no source tag is present.

Frontend behavior:

- `src/data/api-templates.ts` exports `SERVER_TEMPLATE_SOURCE_TAG` as `source:rest`.
- `src/pages/Templates.tsx` sends `tags: [SERVER_TEMPLATE_SOURCE_TAG]` when creating a server from any API template.
- Tools from the template are added after the tagged server is created.

Risk to preserve:

- Do not create API-template servers without `source:rest`; they should appear and behave as REST API servers immediately.
- Do not use non-REST source tags for entries in `API_TEMPLATES`.

## Page-Based Entity Creation

Goal: make primary creation flows feel consistent with server creation instead of mixing modals, drawers, and pages for similar tasks.

Entry points:

- `/servers/new`
- `/prompts/new`
- `/secrets/new`

Frontend behavior:

- List pages remain browse/manage surfaces.
- Primary create buttons navigate to a dedicated `new` route.
- New entity pages use a stepper and a final review step.
- Server source cards support single-click to select and double-click to select and continue to the Details step.
- Prompt creation uses Details, Content, and Review steps, then navigates to `/prompts/:id`.
- Secret creation uses Details, Value, and Review steps, then navigates to `/secrets/:id`.
- Server creation remains the most complex flow and continues to use source-specific steps.

Risk to preserve:

- Do not reintroduce modal/drawer creation for primary entities when a dedicated `new` route exists.
- Keep sensitive secret values masked in review and out of metadata responses.
- Keep creation routes permission-gated with the same permissions used by the list actions.

## Data Source Operations

Goal: make data-source backed servers feel operation-first instead of query-specific.

Entry points:

- `/servers/:id`, for database, NoSQL, and other source-backed servers.

Frontend behavior:

- The server-detail navigation shows `Operations` for data-source backed servers.
- The Operations tab is the place to create source operations before exposing them as MCP tools.
- Tool creation refers to selecting an operation, not selecting a query.
- Source-specific editors may still use precise labels such as `SQL Query`, Mongo operation type, Redis command, GraphQL operation, or gRPC method.
- Operations carry an input schema derived from their input parameters and may define an output schema before being exposed through MCP.
- Operation input parameters behave like GET query parameters: callers provide values, and the operation can use them as variables in the source-specific execution definition.
- In the operation editor, input parameters appear before the source-specific query, command, document, or request body so users define the contract before the execution logic.
- Tool creation copies the selected operation's input/output schemas when available.

Compatibility note:

- Backend routes and storage may still use `queries` and `DbQuery` until the operation-first backend migration is complete.

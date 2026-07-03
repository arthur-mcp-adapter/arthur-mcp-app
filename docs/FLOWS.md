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

## Language / i18n

Goal: let users view the app in a supported language (English or Brazilian Portuguese).

Entry points:

- Global language selector in the app shell / user menu.

Frontend behavior:

- `src/i18n.ts` initializes i18next with `en` and `pt-BR` resources.
- Language detection checks `localStorage.lang` first, then the browser navigator language, and falls back to English.
- Translation resources are grouped by namespace under `src/locales/<locale>/`.
- All user-facing strings must use `t()` from `useTranslation`; do not hardcode English on pages that already import a namespace.
- The `serverDetail` namespace covers the full server detail page including the `auth` sub-key for `AuthConfigPanel` strings.

Settings page behavior:

- Settings uses contextual tab navigation: Server, Security, Headers, and E-mail tabs.
- The Security section configures the JWT signing secret. Saving requires `settings_manage`; GET only returns `jwtSecretSet`, never the value.
- Rotating the JWT secret invalidates existing sessions, OAuth/MCP bearer tokens, and share links.

Risk to preserve:

- Do not hardcode new user-facing strings on pages that already use i18n.
- Keep translation keys in English even when locale values are translated.

## Observability Runtime

Goal: let authorized operators verify the technical observability layer that the backend exposes: health probes, Prometheus metrics, structured logs, correlation IDs, and optional OpenTelemetry tracing.

Entry points:

- `/observability`

Permissions:

- `observability_view`: can view the Observability runtime page.
- `settings_manage`: can save the persisted environment-control draft shown on the Observability page.

Backend behavior:

- `GET /health`, `GET /ready`, `GET /live`, and `GET /metrics` are public operational endpoints outside the `/api` prefix.
- Logs are emitted to stdout/stderr as structured JSON when `ENABLE_STRUCTURED_LOGS=true`.
- Metrics include Node.js defaults, HTTP request metrics, and MCP-specific metrics for tools, resources, prompts, and external HTTP.

Frontend behavior:

- The page checks `/health`, `/ready`, `/live`, and `/metrics` directly from the browser.
- The page lets operators customize an environment variable draft stored in `settings.observabilityEnvironment`.
- Legacy provider routes under `/observability/new` and `/observability/:id` redirect to `/observability`.

Risk to preserve:

- Do not require authentication for operational probe endpoints.
- Keep the page focused on technical observability.

## Public MCP Share Page

Goal: let someone with a share link understand and connect to an MCP server without needing an app login.

Entry points:

- `POST /api/swagger/servers/:id/share-link` from the authenticated server Connect tab.
- Public `/mcp-swagger/:serverSlug` route for newly generated links (permanent, no token), with legacy `/mcp-swagger/:serverSlug/:token`, `/share/:serverSlug/:token`, and `/share/:token` links still supported.
- Public `GET /api/share/by-slug/:slug` endpoint for the current link format; legacy `GET /api/share/:token` endpoint for old token-based links.

Permissions:

- Generating a share link requires `servers_share`.
- Viewing `/mcp-swagger/:serverSlug` (or any legacy token-based variant) is public. The share slug itself is now the access boundary — anyone who knows or guesses the slug can view the page.

Backend behavior:

- Servers receive a unique human-readable share slug automatically from the server name when created or first shared. Users with server settings permission can edit the slug, but it must remain unique across servers. Editing the slug is also how a previously shared link is revoked: the old slug stops resolving once changed.
- The MCP runtime endpoint accepts both `/api/mcp/server/:serverId` and `/api/mcp/server/:shareSlug`. Server Detail and the public Share page show the slug URL when `shareSlug` exists and fall back to the UUID URL for older or unslugged servers.
- New share links are `/mcp-swagger/:shareSlug` with no token — the link never expires and stays valid until the slug is changed. `GET /api/share/by-slug/:slug` looks the server up directly by slug via `findByIdOrShareSlug`, with no signature or expiry check.
- Links generated before this change embedded a signed JWT (30-day expiration, server id + share type) after the slug. `GET /api/share/:token` still validates those tokens so old links keep working; no new tokens are minted.
- The public payload includes only the MCP-facing contract for exposed items: server metadata, MCP URL, auth-required flag, counts, tools, public tool parameters, resources, resolved prompts, descriptions, prompt arguments/content, resource URIs, MIME types, and output schemas.
- The public payload must not include MCP API key values, upstream auth credentials, OAuth client secrets, connection credentials, Error Tracking DSNs, secret values, raw request bodies, raw input schemas, endpoint methods/paths, HTTP method markers in descriptions, operations, API base URLs, source/data-source types, source tags, prompt tags, internal enabled/disabled flags, resource implementation type, runtime settings, or other origin details.

Frontend behavior:

- The share page keeps the existing MCP URL, QR code, and setup instructions for Claude Desktop, Cursor, and generic MCP clients.
- The page presents a Swagger UI-like public documentation layout: a dark product bar, server info header, copy-ready MCP endpoint band with QR code, and colored expandable operation rows for Tools, Resources, Prompts, and setup instructions.
- When the shared server requires MCP authentication, the page follows the Swagger UI pattern: a global Authorize action opens a dialog for the MCP API key, shows an authorized state after saving, and sends the value as the `auth` header only when running simulator requests.
- When an OAuth Client is configured, the public share payload exposes only a `hasOAuthClient` boolean. The Authorize dialog accepts client credentials, exchanges them through `/oauth/server/:serverId/token` with `grant_type=client_credentials`, stores only the resulting access token in page state, and sends it as `Authorization: Bearer <token>` for simulator requests.
- Tools, Resources, and Prompts include a simulator mode that sends JSON-RPC requests to the MCP endpoint, matching how an AI client would call `tools/call`, `resources/read`, and `prompts/get`.
- Tools show public parameters and output schema JSON when declared; resources show output schema JSON when declared.
- Prompts show resolved prompt content and template arguments.
- Resources show URI, MIME type, and output schema where available.

Risk to preserve:

- Do not require login on `/mcp-swagger/:serverSlug` or any legacy token-based variant.
- Treat the share page as public documentation; never expose credentials or secret values there.
- Changing a server's share slug is the only revocation mechanism for the current link format — there is no expiry to fall back on.
- Treat simulator execution as MCP client behavior: share-link access lets the user see the public contract, while protected servers still require the visitor to provide a valid API key or valid OAuth client credentials before calls succeed.
- Add fields to the share payload rather than removing existing setup fields, so older clients/pages remain compatible.

## REST Server Templates

Goal: let users create a preconfigured REST server from a template while preserving source-type filtering.

Entry points:

- `/templates`

Backend behavior:

- `POST /api/swagger/servers` accepts optional `tags` when creating an empty server.
- Template-created servers must include `source:rest` in `tags`.

Frontend behavior:

- `src/data/api-templates.ts` exports `SERVER_TEMPLATE_SOURCE_TAG` as `source:rest`.
- Tools from the template are added after the tagged server is created.

Risk to preserve:

- Do not create API-template servers without `source:rest`.

## Page-Based Entity Creation

Goal: make primary creation flows consistent with server creation.

Entry points:

- `/servers/new`, `/prompts/new`, `/secrets/new`, `/ai-providers/new`

Frontend behavior:

- List pages are browse/manage surfaces.
- Primary create buttons navigate to a dedicated `new` route.
- New entity pages use a stepper and a final review step.
- Server creation remains the most complex flow with source-specific steps.
- On `/servers/new`, source cards marked as not available show the `Soon` badge and are intentionally non-selectable; only available source cards can unlock the next step or advance on double-click.
- On `/servers/new`, the REST tools overview shows the AI tool improvement panel as `Soon` and disabled; the frontend does not allow the generation action to run while the feature is blocked.

Risk to preserve:

- Do not reintroduce modal/drawer creation for primary entities when a dedicated `new` route exists.
- Keep sensitive values (secret vault values, AI provider API keys) masked in review and absent from metadata responses.

## Data Source Operations

Goal: make data-source backed servers feel operation-first instead of query-specific.

Entry points:

- `/servers/:id` for database, NoSQL, and other source-backed servers.

Frontend behavior:

- The server-detail navigation shows `Operations` for data-source backed servers.
- The Operations tab is where source operations are created before being exposed as MCP tools.
- Operation input parameters behave like GET query parameters: callers provide values used as variables in the execution definition.

Compatibility note:

- Backend routes and storage may still use `queries` and `DbQuery` until the operation-first backend migration is complete.

## AI Providers

Goal: let authorized users configure external AI model integrations (OpenAI, Anthropic, Ollama, etc.) with secure API key storage.

Entry points:

- `/ai-providers`
- `/ai-providers/new`
- `/ai-providers/:id`

Permissions:

- `ai_providers_view`: can list and view AI provider metadata.
- `ai_providers_create`: can create providers.
- `ai_providers_edit`: can update provider settings.
- `ai_providers_delete`: can delete providers.
- `ai_providers_execute`: can test provider connectivity and use configured providers for AI-assisted generation.

Backend behavior:

- `GET /api/ai-providers` and `GET /api/ai-providers/:id` return metadata only — `apiKey` is always stripped from responses.
- `POST /api/ai-providers` accepts `name`, `provider`, `model`, `apiKey`, `baseUrl` (optional), `description` (optional), `isActive` (default true), and `isDefault` (default false). Ollama can be saved with an empty API key.
- `PATCH /api/ai-providers/:id` accepts any subset of the above fields. The `apiKey` field is write-only and not returned.
- `POST /api/ai-providers/:id/default` marks a provider active/default and clears the default flag on all other providers.
- `POST /api/ai-providers/:id/test` calls the provider with a minimal prompt, stores `lastTestStatus`, `lastTestedAt`, and `lastTestError`, and returns a success/error summary.
- `POST /api/ai-providers/test-config` tests an unsaved provider draft and returns the same success/error summary without persisting metadata; upstream provider failures are normalized as `{ ok: false, message, latencyMs: 0 }`.
- `POST /api/ai-providers/generate-tools` uses the selected provider, or the active default provider when omitted, to improve imported REST tool names, descriptions, and output schema hints.
- `DELETE /api/ai-providers/:id` hard-deletes the record.
- `provider` must be one of the known enum values: `openai`, `anthropic`, `ollama`, `groq`, `cohere`, `azure-openai`, `google`, `mistral`, `custom`. Legacy frontend values `azure` and `gemini` are still read as Azure OpenAI and Google Gemini labels for compatibility.
- All endpoints require `JwtAuthGuard` + `PermissionsGuard`.
- Repository pattern with `AI_PROVIDER_REPO` injection token; TypeORM and MongoDB implementations.

Frontend behavior:

- List page shows name, provider type, model, default status, test status, active/inactive chip, and update date. API key is never displayed.
- Detail page shows the same metadata with an edit form, test connection action, and default-provider action.
- The current frontend only allows one AI provider to be configured: the list disables the new-provider action once a provider exists, and `/ai-providers/new` shows a limited-state message with a link to edit the existing provider. This is a UI/platform constraint for the current version, not a backend persistence guarantee.
- New provider setup supports OpenAI, Anthropic, Google Gemini, Mistral, Groq, Cohere, Azure OpenAI, Ollama, and custom OpenAI-compatible providers.
- The REST server creation flow has a planned AI-assisted tool improvement panel for imported tool names/descriptions, but it is currently shown as `Soon` and disabled in the frontend.

Risk to preserve:

- Never return `apiKey` in any GET response.
- Never log `apiKey` at any log level.
- `isActive: false` providers are stored but should not be selected for active AI workflows.

## Server Resources

Goal: let authorized users manage and test static or dynamic MCP Resources exposed by a server.

Entry points:

- `/servers/:id` -> Resources tab

Permissions:

- `resources_view`: required to view resources.
- `resources_create`, `resources_edit`, and `resources_delete`: required for matching resource mutations.

Frontend behavior:

- The Resources tab lists configured resources and lets users create static resources or generate dynamic resources from endpoints.
- The resource execute panel sends a JSON-RPC `resources/read` request to the server MCP endpoint.
- When a resource execution response is HTML, the frontend shows an isolated sandboxed HTML preview block and keeps the raw response visible below it.

Risk to preserve:

- Keep HTML previews sandboxed; do not execute returned scripts in the app origin.
- Keep resource mutation controls aligned with the resource permissions above.

## Chains

Goal: let users define multi-step tool sequences (chains) within a server and expose them as single MCP tools.

Entry points:

- `/servers/:id` → Chains tab

Permissions:

- Chains are part of the server; access follows server permissions (`servers_view`, `servers_edit_settings`, `servers_delete`).

Backend behavior:

- Chains are stored as JSON in `SwaggerProjectEntity.chains` (TypeORM) and `SwaggerProjectSchema.chains` (MongoDB).
- `GET /api/swagger/servers/:id` includes the full `chains` array.
- `POST /api/swagger/servers/:id/chains` creates a chain.
- `PATCH /api/swagger/servers/:id/chains/:chainId` updates a chain.
- `DELETE /api/swagger/servers/:id/chains/:chainId` deletes a chain.
- Each chain has: `id` (uuid), `name`, `description`, `steps[]`, `inputSchema`, `outputMapping`.
- Each step references a `toolName` and maps input fields using `inputSource` (literal, chain_input, or prior step output).

Frontend behavior:

- The Chains tab in ServerDetail lists existing chains and opens a `ChainDialog` for create/edit.
- `ChainDialog` uses `StepBuilder` to configure individual steps inline.
- Each step selects a tool from the server's tool list and maps its inputs.
- Chains are visible to the MCP client as regular tools once created.

Risk to preserve:

- Chain execution in `dynamic-mcp.service.ts` must resolve step outputs sequentially; do not parallelize steps.
- Chain step input sources must be validated server-side before execution.

## Execution Logs

Goal: let authorized users trace every MCP and direct tool call with timing, status, and payload details.

Entry points:

- `/servers/:id` → Logs tab

Permissions:

- `servers_view`: required to access the server detail page where logs are shown.

Backend behavior:

- `ExecutionLogsService` stores entries in an in-memory node-cache with a 7-day TTL.
- Each `LogEntry` includes: `id`, `serverId`, `serverName`, `toolName`, `source` (mcp|direct), `statusCode`, `responseTimeMs`, `isError`, `errorMessage?`, `requestPayload?`, `responsePayload?`, `createdAt`.
- `requestPayload` is the effective args object passed to the tool after tenant parameter injection.
- `responsePayload` is the parsed HTTP response body (falls back to raw string when body is not valid JSON).
- `GET /api/execution-logs/:serverId` returns paginated log entries for a server.
- `GET /api/execution-logs/:serverId/stats` returns aggregate stats.
- Logs are cleared when a server is deleted.

Frontend behavior:

- The Logs tab shows a table with columns: tool, source, status, time (ms), error flag, and timestamp.
- Expanding a row reveals `requestPayload` and `responsePayload` as formatted JSON.
- Stats section shows total calls, error rate, and avg response time.

Risk to preserve:

- Payloads may contain sensitive data; do not log them at a level that persists beyond the in-memory store.
- The in-memory store is not replicated across instances; do not assume log completeness in a multi-instance deployment.

## Roles and Permissions

Goal: let admin users control access to every feature area through named roles with granular per-feature permission flags.

Entry points:

- `/profile` (role editor for admin)
- `AuthContext` (permission checks across all pages)

Backend behavior:

- `RolePermissions` interface in `role.repository.ts` defines all boolean permission keys. Adding a new feature area requires adding keys here.
- `permissions.ts` defines `ALL_PERMISSIONS_OFF` (all false) and `BUILTIN_ROLE_PERMISSIONS` for `developer`, `editor`, and `viewer` preset roles.
- `PermissionsGuard` reads `@RequirePermission('key')` from the route handler and rejects with 403 when the authenticated user's role lacks that key.
- JWT payload includes `role`; the role's permission set is fetched from the DB on each guarded request.
- `admin` is a hardcoded super-role that always passes all permission checks.

Frontend behavior:

- `AuthContext` exposes `UserPermissions` and `usePermission(key)` hook.
- Pages and action buttons check permissions before rendering or enabling actions.
- The Profile page renders `PERMISSION_GROUPS` as a matrix editor for custom roles.
- Builtin roles (`admin`, `developer`, `editor`, `viewer`) are rendered as read-only presets in the role selector.

Permission groups and their keys (as of this writing):

| Group | Keys |
|---|---|
| Servers | `servers_view` `servers_create` `servers_edit_settings` `servers_delete` `servers_toggle_active` `servers_share` |
| Tools | `tools_view` `tools_create` `tools_edit` `tools_delete` `tools_test` `endpoints_create` |
| Resources | `resources_view` `resources_create` `resources_edit` `resources_delete` |
| Prompts | `prompts_view` `prompts_create` `prompts_edit` `prompts_delete` |
| Secrets | `secrets_view_names` `secrets_reveal_values` `secrets_create` `secrets_edit` `secrets_delete` |
| API Keys | `api_keys_view` `api_keys_create` `api_keys_delete` |
| Users & Roles | `users_view` `users_invite` `users_edit` `users_delete` `roles_view` `roles_manage` |
| Audit & Logs | `audit_view` `audit_export` |
| Templates | `templates_use` |
| Settings | `settings_manage` |
| Observability | `observability_view` `observability_create` `observability_edit` `observability_delete` |
| Error Tracking | `error_tracking_view` `error_tracking_create` `error_tracking_edit` `error_tracking_delete` |
| AI Providers | `ai_providers_view` `ai_providers_create` `ai_providers_edit` `ai_providers_delete` `ai_providers_execute` |

Risk to preserve:

- Adding a new permission key requires changes in: `role.repository.ts`, `permissions.ts` (ALL_PERMISSIONS_OFF + builtin presets), `Profile/index.tsx` (RolePermissions type + PERMISSION_GROUPS + ALL_OFF + BUILTIN_ROLES), and both locale files (`en/profile.json`, `pt-BR/profile.json`).
- Do not rely on frontend permission checks as the sole gate; backend `@RequirePermission` is authoritative.

## Error Tracking

Goal: send backend request and application errors to the active Error Tracking provider when one is enabled.

Entry points:

- Any backend HTTP route under `/api`.
- MCP routes under `/mcp/*`.
- Backend flows that normalize failures into response bodies, such as AI provider tests and database operation tests.
- Process-level `unhandledRejection` and `uncaughtException` events.

Backend behavior:

- `ErrorTrackingService.captureBackendError(...)` is the shared capture path. It is a no-op when no provider is active.
- `McpExceptionFilter` reports every exception it handles before preserving the existing HTTP or JSON-RPC error response.
- `SpaFilter` reports API/MCP 404s that it handles, but does not report normal client-side React Router fallback routes.
- `DynamicMcpService` reports MCP tool, chain, resource, and prompt failures, including paths that return `isError` or text error content instead of throwing.
- `AiProvidersService` reports failed saved/draft provider tests even when the API returns `{ ok: false }`.
- `SwaggerService` reports database connection/query test failures that are returned to the frontend as `{ error }`.
- `main.ts` registers process-level handlers for unhandled promise rejections and uncaught exceptions.

Risk to preserve:

- Error capture must never block or alter the user's API/MCP response.
- Do not send raw request bodies, cookies, authorization headers, API keys, DSNs, or secret values to Error Tracking.
- New backend catch blocks that convert exceptions into normal response bodies must call `captureBackendError(...)`.

## MCP Tool Execution (dynamic-mcp)

Goal: translate an MCP client tool call into an HTTP request to the upstream API, with authentication, tenant param injection, logging, and error tracking.

Entry points:

- Any MCP client connected via `/mcp/:apiKey` SSE or Streamable HTTP.

Flow:

1. MCP client sends `tools/call` with `toolName` and `args`.
2. `DynamicMcpService` resolves the server by `apiKey` and checks `isActive`.
3. Tenant parameters are injected into `args` (`injectTenantParams`).
4. `buildRequest(effectiveArgs, tool.endpointRef, globalHeaders)` constructs the HTTP request.
5. `applyAuth(req, auth)` injects auth credentials (bearer, api-key, basic, oauth2-client, custom).
6. `executeObservedRequest(req)` executes and records metrics/tracing.
7. On success: response is mapped with `mapResponse(httpRes)` → MCP content array.
8. `executionLogs.log(...)` records `requestPayload: effectiveArgs` and `responsePayload: tryParseJson(httpRes.body)`.
9. On error: `ErrorTrackingService.captureBackendError(...)` or `captureToolError(...)` reports to the active provider, and `executionLogs.log({ isError: true })` records local execution history.
10. If the tool is part of a chain, chain orchestration sequentially calls each step using prior step outputs as inputs.

Risk to preserve:

- `effectiveArgs` (post-injection) must be used for both the HTTP request and the `requestPayload` log, not the raw `args`.
- OAuth2 tokens are cached and renewed transparently; do not expose them in logs.
- Error responses from the upstream API are mapped to MCP `isError: true` content, not thrown as exceptions.

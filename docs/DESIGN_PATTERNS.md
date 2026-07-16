# Design Patterns

This document records the backend and frontend design patterns currently used in the project. Keep it in sync whenever implementation style, architecture, state management, data access, routing, validation, UI composition, or cross-cutting behavior changes.

## Backend Patterns

The backend is a NestJS application organized around domain modules, repository contracts, and cross-cutting providers.

### Modular Architecture

Pattern: NestJS module per domain.

Examples:

- `api/src/users/users.module.ts`
- `api/src/auth/auth.module.ts`
- `api/src/swagger/swagger.module.ts`
- `api/src/dynamic-mcp/dynamic-mcp.module.ts`

Rules:

- Keep controllers, services, repositories, entities, and schemas close to their domain.
- Export services only when another module needs them.
- Prefer importing another module over reaching across folders for implementation details.
- Register cross-cutting providers at the app level only when they truly apply globally.

### Controller-Service Separation

Pattern: controllers handle HTTP concerns; services own business behavior.

Examples:

- `UsersController` handles route decorators, request data, and response status. `GET /users/me` is composed entirely from the verified Supabase JWT claims on `req.user` plus a role→permissions lookup — no database read, no `UsersService` involved. (`UsersService`/`UserEntity` are legacy, pending removal — see `docs/ENTITIES.md`.)

Rules:

- Controllers should stay thin and delegate business decisions to services.
- Services should not depend on Express request/response objects.
- Throw Nest exceptions from services when the failure belongs to business/domain behavior.
- Keep DTO-like request shapes explicit, even when they are inline types.
- Prefer named DTO classes under `dto/` for mutation-heavy controllers so request shapes stay searchable and reusable.

### Repository Contract

Pattern: services depend on repository interfaces injected by tokens, not directly on TypeORM repositories.

Examples:

- Tokens: `api/src/database/database.tokens.ts`
- Contracts: `api/src/users/user.repository.ts`, `api/src/swagger/swagger-project.repository.ts`
- Implementations: `repositories/typeorm-*.repository.ts`

Rules:

- Add or change fields in this order: entity, repository contract, TypeORM repository, service usage, docs.
- Keep repository return records stable.
- Map TypeORM `id` to `_id` consistently at repository boundaries.
- Keep JSON serialization/deserialization inside repository implementations, not services.
- Use separate read models for security-sensitive records when different use cases need different field visibility. For example, `SecretRecord` includes `value` for internal resolution, while API-facing list/read flows return metadata without `value`.
- Preserve server source tags as regular `tags` entries using the `source:<type>` format.

### Database Driver Selection

Pattern: `DatabaseModule.forRoot()` selects the TypeORM driver by parsing the `DATABASE_URI` connection string. There is no separate `DATABASE` variable — the scheme of `DATABASE_URI` determines the driver.

Supported schemes:

| `DATABASE_URI` scheme | Driver | Notes |
|---|---|---|
| `sqlite:<path>` (default: `sqlite:database.sqlite`) | TypeORM + sqlite3 | Local file, zero setup; schema changes must use migrations |
| `postgres://...` / `postgresql://...` | TypeORM + pg | PostgreSQL 14+; add `?sslmode=require` to enable TLS |
| `mysql://...` | TypeORM + mysql2 | MySQL 8+ / MariaDB 10.6+; add `?ssl=true` to enable TLS |

Examples:

- `TypeOrmModule.forRoot()` and `TypeOrmModule.forFeature()`. The driver is selected by `buildTypeOrmOptions()`, which calls `parseDatabaseUri()` (`api/src/database/database-uri.ts`) to detect the scheme and builds `DataSourceOptions` accordingly.

Rules:

- Any domain entity must support all three drivers unless the feature is intentionally backend-specific.
- Application startup must fail during environment validation when `DATABASE_URI` does not use one of the supported schemes: `sqlite:`, `postgres://`/`postgresql://`, or `mysql://`.
- Document differences in `docs/ENTITIES.md`.
- Avoid leaking database-specific types outside repositories.
- TypeORM repositories are driver-agnostic and prefixed `typeorm-*`. They work identically with SQLite, MySQL, and PostgreSQL.
- TypeORM `synchronize` must stay disabled for every driver, including local SQLite.
- All database schema changes, seed/backfill changes, field additions/removals, index changes, and data-shape migrations must be shipped through explicit migrations. Do not use `DB_SYNC`, startup sync, or manual edits to local database files as the delivery mechanism.
- Pending TypeORM migrations run automatically during application startup through `migrationsRun: true`; a failed migration must block startup instead of letting the app run against an incompatible schema.
- When changing persistence, commit the entity/repository change and its migration together, then document the resulting entity shape in `docs/ENTITIES.md`.

### Guard and Decorator Authorization

Pattern: authentication and permissions are enforced through guards and metadata decorators.

Examples:

- `JwtAuthGuard` — the sole authentication guard; verifies a Supabase Auth JWT via `SupabaseAuthService` and attaches `req.user`. No local Passport strategy or fallback.
- `PermissionsGuard`
- `RequirePermission`
- `McpApiKeyGuard`
- `ProjectStateGuard`
- `RateLimitGuard`

Rules:

- Use guards for route access decisions.
- Use decorators for declarative permission requirements.
- Keep permission names aligned with `RolePermissions` and frontend `Permission`.
- Keep built-in backend role presets in `api/src/roles/permissions.ts`.
- Keep frontend fallback presets in `src/context/permissionPresets.ts`.
- Admin bypass behavior belongs in the guard, not each controller.
- Treat permissions as part of feature design. Any new API endpoint, page, tab, integration, credential surface, settings panel, or create/edit/delete/test/share action must either reuse an existing permission intentionally or introduce a new permission end-to-end.
- When introducing a new permission, update all permission surfaces in one change: backend `RolePermissions`, backend role presets, frontend `Permission`, frontend `UserPermissions`, frontend fallback presets, backend guards/decorators, UI `can(Permission.X)` gates, tests, and documentation.
- Do not add frontend-only permissions without backend support. If backend support must be deferred, record the gap in `docs/ROADMAP.md` and keep the UI inaccessible or clearly non-shipping until the backend permission exists.
- Do not add backend-only protected behavior without updating the frontend permission model and user-facing restricted/disabled states.

### Cross-Cutting Filters and Interceptors

Pattern: global providers handle behavior that cuts across modules.

Examples:

- `McpExceptionFilter` registered through `APP_FILTER`.
- Observability interceptors registered through `APP_INTERCEPTOR` in `ObservabilityModule`.
- `SpaFilter` registered in `main.ts` for React Router fallback.
- `AppLoggerService` configured during bootstrap for structured JSON logs.

Rules:

- Use filters for consistent exception shaping or routing fallback.
- `McpExceptionFilter` reports every HTTP/MCP exception it handles to the active Error Tracking provider before returning the existing HTTP or JSON-RPC error response.
- `SpaFilter` reports API/MCP 404 responses it handles, while still avoiding client-side React Router fallback routes.
- Use interceptors for logging, metrics, or request lifecycle behavior.
- Keep MCP-specific behavior isolated from regular REST API behavior when possible.

### Error Tracking

Pattern: backend errors are routed to the active Error Tracking provider through `ErrorTrackingService`.

Examples:

- `McpExceptionFilter` captures thrown HTTP and MCP exceptions.
- `SpaFilter` captures API/MCP 404s when it handles routing fallback.
- `DynamicMcpService` captures MCP tool/resource/prompt failures, including paths that return `isError` instead of throwing.
- `AiProvidersService` and `SwaggerService` capture provider/database test failures that are normalized into `{ ok: false }` or `{ error }` responses.
- `main.ts` registers process-level `unhandledRejection` and `uncaughtException` handlers.

Rules:

- Error tracking is active only when an Error Tracking provider is enabled; capture methods must be no-ops otherwise.
- Error tracking capture must never change the HTTP/MCP response or throw back into the request path.
- Do not send raw request bodies, cookies, authorization headers, API keys, DSNs, or secret values to Error Tracking. Prefer method, path, status, user id/role, and domain tags.
- When adding a new backend path that catches an exception and returns a normal error response, call `ErrorTrackingService.captureBackendError(...)` in that catch block.
- When adding MCP flows that return `isError` without throwing, capture the error explicitly because those paths bypass global Nest exception filters.

### Observability

Pattern: technical observability is a reusable cross-cutting module under `api/src/observability/`.

Examples:

- `HealthController` exposes `/health`, `/ready`, and `/live`.
- `MetricsController` exposes `/metrics` using `prom-client`.
- `CorrelationIdMiddleware` generates or reuses `x-request-id`, `x-correlation-id`, and trace identifiers.
- `RequestLoggerMiddleware` emits structured HTTP completion logs.
- `MetricsInterceptor` records HTTP request totals, errors, and latency.
- `TracingInterceptor` creates HTTP spans when tracing is enabled.
- `DynamicMcpService` records MCP tool, resource, prompt, and external HTTP metrics/traces through `MetricsService` and `TracingService`.

Rules:

- Keep observability optional through environment variables; disabling metrics or tracing must not prevent startup.
- Emit logs to stdout/stderr as structured JSON when `ENABLE_STRUCTURED_LOGS=true`.
- Do not couple observability to user-facing feature permissions. `/health`, `/ready`, `/live`, and `/metrics` are public operational endpoints by design.
- Use `MetricsService` for new Prometheus metrics instead of constructing counters in feature modules.
- Use `TracingService.runInSpan()` for feature-specific spans so tracing remains a no-op when disabled.
- Propagate correlation headers to outbound HTTP requests.
- Keep Grafana, Prometheus, and Tempo helper files under the root `observability/` folder.

### Pure Functions for Protocol Transformations

Pattern: stateless transformations are implemented as pure functions outside Nest providers.

Examples:

- `openapi-parser.ts`
- `param-builder.ts`
- `request-builder.ts`
- `response-mapper.ts`
- `schema-converter.ts`
- `tool-generator.ts`

Rules:

- Prefer pure functions for parsing, mapping, generation, and request construction.
- Add focused unit tests for transformation logic.
- Keep side effects, network calls, and database access out of these files.

### Adapter Pattern for External Execution

Pattern: dynamic execution is routed to source-specific adapters.

Examples:

- `dynamic-mcp/adapters/sql.adapter.ts`
- `dynamic-mcp/adapters/mongodb.adapter.ts`
- `dynamic-mcp/adapters/redis.adapter.ts`

Rules:

- Add a new source by defining its execution reference shape, adapter, validation, and docs.
- Keep driver-specific logic inside the adapter.
- Return normalized results from adapters so MCP response logic can stay generic.
- Fail with actionable missing-driver messages.
- Dynamic MCP dispatch checks `executionRef` first and routes data-source Tools through the adapter layer; HTTP Tools continue through `endpointRef`.
- Resolve `{{secret:NAME}}` recursively in connection configuration immediately before adapter execution, using only secrets owned by the server owner.

### AI Provider Execution

Pattern: AI provider CRUD is separated from provider execution.

Examples:

- `AiProvidersService` owns metadata, default-provider selection, and safe API responses that omit API keys.
- `AiProviderExecutorService` owns provider-specific HTTP calls for connection tests and AI-assisted generation.

Rules:

- Keep API keys server-side and out of metadata responses.
- Protect provider execution with `ai_providers_execute`; do not treat execution as simple provider viewing/editing because it can consume external model credits.
- Use the configured default provider only when a generation request does not explicitly select a provider.
- Assisted-generation requests should send only the minimum metadata needed for the task. For REST tool improvement, the frontend sends endpoint names, methods, paths, and descriptions, not upstream API credentials.

### Facade and Feature Services

Pattern: large domain surfaces can expose a facade service while delegating focused responsibility to feature services.

Examples:

- `SwaggerService` remains the controller-facing facade for Swagger/MCP server operations.
- `SwaggerImportService` owns OpenAPI/Postman import, reimport, discovery, and upstream connection testing.
- `SwaggerApiKeysService` owns legacy and multi-key MCP API key operations.

Rules:

- Extract a feature service when a responsibility can change independently.
- Keep route compatibility in the facade while moving focused behavior behind it.
- Avoid adding new unrelated responsibilities to `SwaggerService`; prefer another focused service.

### Configuration and Bootstrap

Pattern: app-level setup lives in `main.ts` and `AppModule`.

Examples:

- `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`
- Global `/api` prefix with explicit exclusions for health, MCP, docs, and OAuth endpoints.
- Operational endpoints `/health`, `/ready`, `/live`, and `/metrics` are excluded from the `/api` prefix.
- CORS controlled by `CORS_ORIGIN`.
- Static Vite build serving through Express when nginx is not in front.

Rules:

- Keep environment validation in `api/src/config/env.validation.ts`.
- `JWT_SECRET`/`JwtSecretService` scope is now narrower: user login sessions are entirely Supabase's (verified via JWKS, not this secret). `JWT_SECRET` only signs/verifies the MCP-client OAuth tokens issued by `oauth/oauth.service.ts` (`issueToken`/`verifyToken`, checked by `McpApiKeyGuard`) — runtime signing/verification should still resolve through `JwtSecretService` so the Settings singleton can override it with the saved `jwtSecret` value.
- Do not expose saved JWT secrets through API reads; safe Settings responses should expose only `jwtSecretSet`.
- Document command/setup changes in `AGENTS.md`.
- Document deployment behavior changes in the relevant infra docs or `docs/ROADMAP.md` if no dedicated doc exists yet.
- Bind the NestJS HTTP server to `0.0.0.0` and read `process.env.PORT` so Docker and Render can route traffic correctly.

### Testing Pattern

Pattern: use focused Jest tests for services, guards, filters, and pure transformation logic.

Examples:

- `auth.service.spec.ts`
- `roles.service.spec.ts`
- `permissions.guard.spec.ts`
- `request-builder.spec.ts`
- `response-mapper.spec.ts`

Rules:

- Test pure functions directly.
- Test services with mocked repository contracts.
- Add e2e tests when route wiring, guards, or module integration is the risk.
- Backend coverage is gated through `npm run test:cov --prefix api -- --runInBand`.
- The Jest coverage gate tracks service logic, dynamic MCP helper/guard logic, and other testable units. Framework wiring, decorators, entities, schemas, repository implementations, and large legacy facades are excluded from the global coverage gate until they receive dedicated test strategies.
- Keep global backend coverage at or above 80% statements, 70% branches, 80% functions, and 80% lines.

## Frontend Patterns

The frontend is a React/Vite application organized around route-level pages, feature-driven modules, shared Atomic Design components where reuse justifies them, small context providers, controlled barrel exports, and Material UI composition.

### Route-Level Pages

Pattern: each main route maps to a page component under `src/pages/`.

Examples:

- Route table in `src/App.tsx`.
- Pages in `src/pages/Servers/Servers.tsx`, `src/pages/ServerDetail/ServerDetail.tsx`, `src/pages/Settings/Settings.tsx`, and related files.

Rules:

- Put route orchestration, page-specific data loading, and page-local UI state in page components.
- Store route pages in `src/pages/PageName/PageName.tsx`, with `src/pages/PageName/index.ts` as the public entry point and `src/pages/PageName/index.css` as the local stylesheet entry.
- Colocate page-specific tests in the page folder, such as `src/pages/Login/Login.test.tsx`.
- Extract cohesive route feature sections to `src/features/<feature>/` when a page grows beyond orchestration and starts owning unrelated UI, state, and API concerns.
- Extract reusable widgets to `src/components/` only when they are shared across features or are truly domain-neutral.
- Keep route guards in `App.tsx` unless a more general auth/routing abstraction becomes necessary.

### Feature-Driven Architecture

Pattern: domain-specific frontend implementation belongs under `src/features/<feature>/`, while route pages compose feature modules.

Examples:

- `src/features/server/`
- `src/features/prompts/`
- `src/features/secrets/`
- `src/features/settings/`
- Feature barrels such as `src/features/server/index.ts` and `src/features/secrets/index.ts`

Rules:

- Treat a feature as a product capability or domain surface, not just a technical folder.
- Keep feature-owned components, hooks, API helpers, types, constants, and utilities under the owning feature.
- Use nested feature areas when a feature is large, such as `src/features/server/settings/`, `src/features/server/connect/`, and `src/features/server/api-endpoints/`.
- Keep `src/pages/` thin: routing, route params, top-level data loading, page-level state, and composition.
- Avoid importing another feature's internal files. If cross-feature reuse is needed, expose a stable public API through the owning feature's barrel file.
- Do not promote code to shared folders until reuse is real or the code is clearly cross-cutting.
- Preserve behavior during modularization; avoid combining feature extraction with product changes.

Suggested feature shape when useful:

```text
src/features/<feature>/
  components/
  hooks/
  api/
  types/
    entityName.interface.ts
    stateName.type.ts
    index.ts
  constants/
    constantName.constant.ts
  utils/
    actionName.util.ts
  index.ts
```

Use only the folders a feature needs; small features can stay flat.

### Frontend File Responsibilities

Pattern: every frontend module has one explicit kind and owner.

Examples:

- Enum: `src/context/auth/permission.enum.ts`
- Interface: `src/context/auth/userPermissions.interface.ts`
- Role decision: `src/context/auth/utils/userPermissionRole.role.ts`
- Hook: `src/hooks/useDetailPageNav.hook.ts`
- Utility: `src/utils/mcpResponse/parseMcpResponse.util.ts`
- Constant: `src/features/server/constants/methodColor.constant.ts`
- Component props: `src/components/organisms/BaseListCard/baseListCardProps.interface.ts`

Rules:

- Store every named interface, enum, type alias, class, entity, and component props contract in its own lower-camel `name.kind.ts` file.
- Every named frontend `.ts` or `.tsx` file exports exactly one symbol. Re-exports are allowed only in `index.ts`.
- Every directory under `src/` contains `index.ts` and `index.css`; non-public or non-visual directories may use `export {}` and an empty stylesheet.
- Do not add catch-all `types.ts`, `utils.ts`, `constants.ts`, `helpers.ts`, `format.ts`, `validation.ts`, or `*-utils.ts` files.
- Keep `.tsx` modules for React rendering. Top-level functions in component modules must return React UI.
- Closure-based handlers that coordinate component-local state may stay inside the component function. Reusable stateful coordination belongs in a `.hook.ts`; stateless decisions and transformations belong in a focused utility.
- Keep one public utility responsibility per file. Prefer semantic suffixes such as `.role.ts`, `.permission.ts`, `.parser.ts`, `.formatter.ts`, `.validator.ts`, `.mapper.ts`, `.builder.ts`, `.factory.ts`, or `.util.ts`.
- Keep utilities with their owning feature. Promote them to `src/utils/` only when they are genuinely cross-feature.
- Store constants in focused `.constant.ts` files. Large static datasets may remain dedicated data modules after their contracts and builders have been extracted.
- Run `npm run check:frontend-structure` directly when auditing structure. It also runs automatically as part of `npm run type-check`.

### Atomic Design

Pattern: shared reusable UI can follow Atomic Design when the component set grows across features.

Examples:

- Atoms: `src/components/atoms/HelpButton/HelpButton.tsx`, `src/components/atoms/SaveIndicator/SaveIndicator.tsx`
- Organisms: `src/components/organisms/BaseListCard/BaseListCard.tsx`, `src/components/organisms/ConfirmDialog/ConfirmDialog.tsx`
- Templates: `src/components/templates/BaseDialogLayout/BaseDialogLayout.tsx`, `src/components/templates/Layout/Layout.tsx`

Rules:

- Use atoms for domain-neutral primitives such as labels, status chips, badges, icon actions, field pieces, and compact indicators.
- Use molecules for composed controls such as search/filter bars, tag inputs, field rows, action clusters, and compact form groups.
- Use organisms for larger reusable sections such as panels, drawers, accordions, list cards, tables, and settings groups.
- Use templates for reusable page, drawer, or dialog layout shells that do not own domain behavior.
- Keep pages as route-level composition under `src/pages/`.
- Do not create `atoms/`, `molecules/`, `organisms/`, or `templates/` folders for one-off components; introduce them when shared UI volume justifies the structure.
- Keep atoms domain-neutral. If a component knows about servers, prompts, secrets, operations, or MCP details, it usually belongs in a feature.
- Store React components as `ComponentName/ComponentName.tsx`, expose them through `ComponentName/index.ts`, and keep the folder stylesheet at `ComponentName/index.css`.

### Barrel Exports

Pattern: `index.ts` files are the only export aggregators. React implementations use matching named `.tsx` files; `index.tsx` is forbidden.

Examples:

- `src/components/index.ts`
- `src/components/atoms/index.ts`
- `src/features/server/index.ts`
- `src/features/server/settings/index.ts`
- `src/features/prompts/index.ts`
- `src/features/secrets/index.ts`

Rules:

- Use `index.ts` barrels at feature or shared component boundaries when they make imports clearer.
- Keep implementation and executable logic out of `index.ts`; it contains only explicit export declarations.
- Prefer direct sibling imports inside a folder to avoid barrel cycles.
- Export only stable public components, hooks, types, constants, and helpers.
- Prefer named exports and explicit type exports over broad `export *`.
- Avoid barrels in tiny folders with one file unless the folder is expected to grow.
- Avoid importing from a barrel inside the same folder when a direct relative import is clearer.
- Watch for circular dependencies; split modules or use direct imports if a barrel creates cycles.

### Server Detail Feature Modules

Pattern: `ServerDetail` should act as the server detail route orchestrator, while cohesive server sections live under `src/features/server/`.

Examples:

- `src/features/server/settings/RateLimitPanel/RateLimitPanel.tsx`
- `src/features/server/types/project.interface.ts`
- `src/components/atoms/SaveIndicator/SaveIndicator.tsx`

Rules:

- Keep page-level tab selection, project loading, navigation, and cross-tab state in `src/pages/ServerDetail/ServerDetail.tsx`.
- Move self-contained panels, dialogs, accordions, and tab bodies into `src/features/server/<area>/`.
- Store each server contract under `src/features/server/types/name.kind.ts`; expose stable shared contracts through `src/features/server/types/index.ts`.
- Put cross-feature UI widgets in `src/components/` only when they are not specific to server detail.
- Preserve current behavior while extracting modules; avoid combining extraction with product changes.
- Keep the administrative project UUID separate from the MCP transport identifier: `/swagger/servers/:id` calls use the UUID, while Server Detail simulators and generated MCP URLs use the server `shareSlug` (falling back to the UUID only for legacy records without a slug).

### Page-Based Creation Flows

Pattern: primary entity creation uses a dedicated `new` route with a stepper, matching the server creation experience.

Examples:

- `src/pages/NewServer.tsx`
- `src/pages/NewPrompt.tsx`
- `src/pages/NewSecret.tsx`

Rules:

- Use a page route for creating primary entities that users may need to review before saving.
- Use steps for the minimum meaningful sequence: details, content/value/configuration, review.
- Keep the list page as a browsing surface; its primary create action should navigate to the `new` route.
- After successful creation, navigate to the created entity detail page when one exists.
- Use drawers only for contextual secondary flows such as applying a template or editing a small nested item without leaving the current page.
- Keep the stepper, back action, error alert, and final review visually aligned with `NewServer`.
- For selectable cards in the first step, single-click should select and double-click may select and advance when the next step is unambiguous.

### Operation-First Data Source Language

Pattern: user-facing data-source execution surfaces use "Operations" as the generic concept, while source-specific forms can still name the concrete operation type.

Examples:

- `src/pages/ServerDetail.tsx`
- `docs/INTEGRATION_MODEL.pt-BR.md`

Rules:

- Use `Operations` for the server-detail tab and generic CTAs such as add/edit/delete/select.
- Use source-specific labels inside the operation editor, such as `SQL Query`, Mongo operation type, Redis command, GraphQL operation, or gRPC method.
- Keep legacy internal names such as `DbQuery` and `/queries` endpoints during the compatibility phase.
- Do not introduce new user-facing "Queries" labels as the generic concept.
- Store an `inputSchema` and optional `outputSchema` on data-source operations so MCP Tools and Resources can inherit a stable contract.
- Derive `inputSchema` from operation input parameters. Treat these parameters like GET query parameters: MCP clients send values, and operation executors can use them as variables in SQL, JSON templates, Redis keys, GraphQL variables, or request templates.
- In operation forms, place input parameters before source-specific execution fields. The form order should be operation identity, input contract, execution definition, output contract, then testing.

### App Shell and Contextual Navigation

Pattern: `Layout` owns the main shell; `ServerNavContext` lets detail pages replace the default sidebar with contextual navigation.

Examples:

- `src/components/Layout.tsx`
- `src/context/ServerNavProvider.tsx`
- `src/pages/ServerDetail.tsx`

Rules:

- Use default navigation for global app sections.
- Use contextual navigation for server-detail tabs and server-specific workflows.
- Keep navigation visibility tied to permissions through `useAuth().can`.

### Internationalization and Terminology

Pattern: user-facing copy is translated through i18next namespaces, while configurable domain terms are loaded from settings.

Examples:

- `src/i18n.ts`
- `src/locales/en/*.json`
- `src/locales/pt-BR/*.json`
- `src/context/TerminologyContext.tsx`
- `src/pages/Settings.tsx`

Rules:

- Use `useTranslation(namespace)` for page and component copy.
- Keep translation keys, TypeScript identifiers, comments, and documentation in English.
- Locale values under `src/locales/<locale>/` may use the target language.
- Register new namespaces in `src/i18n.ts` and provide values for every supported locale.
- Use `useTerm()` for the configurable MCP domain concepts: server, tool, resource, prompt, chain, and secret.
- Store terminology overrides in the global settings fields `termServer`, `termTool`, `termResource`, `termPrompt`, `termChain`, and `termSecret`.
- After settings saves terminology changes, call `useTerminology().reload()` so active screens can use the updated terms.

### Central API Client

Pattern: all HTTP calls go through the shared Axios instance.

Example:

- `src/api.ts`

Rules:

- Use the shared `api` client instead of creating page-local Axios instances.
- Let the request interceptor attach the bearer token.
- Let the response interceptor handle application-session `401` logout/redirect behavior.
- Do not treat `401` responses from `/mcp/*` transport calls as application-session failures; MCP API key/OAuth authentication is independent from the signed-in Supabase session and its errors must remain visible in the invoking UI.
- Keep endpoint paths relative to `/api`.
- Fetch sensitive values through dedicated reveal endpoints instead of list/detail metadata endpoints.
- When creating servers from REST templates, send `tags: ['source:rest']` with the create request.

### Auth and Permission Context

Pattern: authentication state and permission checks are centralized behind the `src/context/auth/index.ts` public API.

Examples:

- `src/context/auth/AuthProvider.tsx`
- `Permission` enum mirrors backend permission keys.
- `can()` supports backend-provided permissions and role-based fallback.

Rules:

- Gate UI actions with `can(Permission.X)`.
- Keep frontend permission names aligned with backend `RolePermissions`.
- Keep role fallback presets in `src/context/auth/rolePermissionFallbacks.constant.ts`.
- Do not rely on frontend permission checks as the only security layer; backend guards remain authoritative.
- When adding a permission, update backend role permissions, frontend `Permission`, docs, and affected UI.
- Every new route, sidebar item, tab, primary action, destructive action, credential action, execution/test action, and settings control needs a permission decision before implementation is complete.
- Use restricted empty states or disabled controls when the user can view a page but cannot perform a specific action; hide navigation only when the user cannot view the surface at all.
- Keep permission names domain-oriented and action-oriented, such as `<domain>_view`, `<domain>_create`, `<domain>_edit`, `<domain>_delete`, `<domain>_test`, `<domain>_share`, or a more specific verb when the risk is distinct.

### Local Page State

Pattern: page components use React hooks for fetch state, form state, dirty tracking, loading, and feedback.

Examples:

- `Settings` tracks loaded settings, original values, dirty state, saving state, and snackbar state.
- `Servers` tracks projects, health, filters, confirmation dialog state, and snackbar state.

Rules:

- Keep state local when only one page needs it.
- Promote state to context only when multiple unrelated components need shared access.
- Use explicit loading, error, and empty states for user-facing fetches.
- Keep async handlers small enough to show the success and failure path clearly.

### Static Searchable Catalogs

Pattern: large read-only frontend catalogs use a lightweight static summary index plus one static detail file per item.

Example:

- `public/catalogs/api/index.json` contains API card/search metadata; `public/catalogs/api/<id>.json` contains one complete API template.
- `public/catalogs/prompts/index.json` contains prompt card/search metadata; `public/catalogs/prompts/<id>.json` contains one complete prompt template.
- `src/features/templates/` owns index/detail loaders, request caches, hooks, summary contracts, and search normalization.

Rules:

- Do not embed a large read-only catalog in a TypeScript module when consumers can fetch static assets lazily.
- Put only card, grouping, and search fields in the index; keep large nested definitions/content in per-item detail files.
- Load an index when its lazy route needs it and load a detail only after selection.
- Cache index/detail promises in memory and remove failed requests from the cache so retry remains possible.
- Normalize case, diacritics, separators, and whitespace before multi-token client-side search.
- Derive categories from the index rather than maintaining duplicate category constants.
- Validate index/detail parity, safe unique IDs, and domain invariants with `npm run check:template-catalogs`; run the gate in type-check and before builds.
- Static catalog data must not contain credentials or secrets and must not be treated as a permission boundary.
- Prefer this pattern over browser databases for small read-only catalogs; introduce persistence only when editing, synchronization, offline mutation, or relational queries become real requirements.

### API Template Research Staging

Pattern: unverified third-party API directory records are documented in an ordered research layer before they can become executable static templates.

Examples:

- `APIs/MANUAL.md` is the ordered index for the source records in `APIs.json`.
- `APIs/process.md` is the self-contained continuation prompt for another AI assistant.
- `APIs/entries/<order>-<api-name>.md` is the research workspace for one possible integration.
- `APIs/research/official-sources.json` stores reviewed facts and evidence separately from generated prose.
- `APIs/research/runtime/claims/<order>/` is an atomic, per-entry ownership marker for parallel research workers; `results/<order>.json` stages one complete isolated result.
- `APIs/final-apis/<id>.json` stores one YouTube-shaped final candidate for each research entry classified as `documented`.
- `public/catalogs/api/zendesk.json` is the reference shape for a finished API template detail.
- `scripts/generate-api-manuals.mjs` creates the research workspaces and preserves existing entry files by default.
- `scripts/check-api-research.mjs` validates contiguous source order, official HTTPS evidence, supported template values, tool uniqueness, and per-tool evidence links.
- `scripts/generate-final-api-templates.mjs` promotes only documented research records into final candidate files; `scripts/check-final-api-templates.mjs` validates their shape against the API template contract.
- `scripts/publish-api-templates.mjs` copies staged final candidates into `public/catalogs/api/<id>.json` plus a matching `index.json` summary, skipping any `id` or `name` that already exists in the production catalog; run `npm run check:template-catalogs` afterward.

Note: the staging tree originally rooted at `APIs/` (including `APIs.json`) has since been relocated to `api_repository/` by ongoing parallel audit work; treat `api_repository/` as the current path for every example above.

Rules:

- Treat a source `Link` as a discovery location, not as a runtime base URL, unless current official documentation explicitly identifies it as the API root.
- Preserve source order and source metadata so research and review remain traceable.
- Record template identity, presentation, connection, authentication, signup/docs links, tools, and parameters explicitly before conversion.
- Require evidence for the production base URL, version, authentication placement, scopes, endpoint method/path, and parameter definitions.
- Prioritize unaudited APIs from famous, broadly adopted providers for parallel research, using current official adoption evidence when prominence is unclear and source order as the deterministic tie-breaker. Popularity affects research order, not suitability classification or the requirement to review the full catalog.
- Keep one continuity worker on the smallest pending source order so popularity-first research does not indefinitely stall the contiguous checkpoint. Classify each reviewed entry as `documented`, `partial`, `blocked`, `inactive`, or `non-api`.
- Parallelize provider research through atomic order-specific directory claims, never through a shared read-modify-write number list. Workers stage isolated per-entry results and must not edit consolidated or generated artifacts.
- Use one explicit coordinator to validate staged results and append only the longest contiguous sequence to `official-sources.json`; out-of-order results remain staged until every preceding order exists.
- Never reclaim another worker's order based on age alone. Confirm that the owner is inactive, preserve orphaned claim history under `failed/`, and only then make the order claimable again.
- Treat provider documentation, provider-owned machine-readable specifications, and the provider's own source repository as primary evidence; marketplace pages alone do not justify inventing hidden runtime details.
- Record response shape, common errors, pagination, rate limits, idempotency, lifecycle, verification date, and evidence URLs even when the current template contract does not store each item directly.
- Prefer three to six high-value, tested tools over mechanically copying every upstream endpoint.
- Use the current supported template enums for authentication, HTTP methods, parameter locations, and parameter types; unresolved mappings remain pending rather than being guessed.
- Entries that map to an existing template ID must be reviewed and merged instead of creating a duplicate detail file.
- Before publishing a staged final candidate into `public/catalogs/api/`, check both `id` and `name` against the existing catalog; the same real provider can be independently re-researched under a different `id` (e.g. `openlibrary` vs. `open-library`), and only one detail file may exist per provider.
- A research JSON scaffold containing `<PENDING_...>` values is not valid catalog data and must never be copied into `public/catalogs/api/` unchanged.
- Final candidates omit research-only evidence fields, use filenames matching their safe IDs, and retain exactly one API template per JSON file.
- `partial`, `blocked`, `inactive`, and `non-api` records must not be emitted into `APIs/final-apis/`.
- Regenerate research files with `--force` only when intentionally discarding manual verification work.

### Shared Feedback Components

Pattern: common feedback UI lives in reusable components.

Examples:

- `AppSnackbar`
- `ConfirmDialog`
- `HelpButton`
- `SecretAutocomplete`

Rules:

- Use `AppSnackbar` for transient success/error messages.
- Use `ConfirmDialog` for destructive or high-impact confirmations.
- Use `HelpButton` for contextual help that explains domain behavior.
- Keep reusable components generic and page-specific copy in the caller.
- Keep reusable component copy translation-ready by accepting labels from callers or using a stable namespace.

### Material UI Composition

Pattern: interfaces are built with MUI primitives, the `sx` prop, outlined surfaces, compact density, and Tabler/MUI icons.

Examples:

- `src/theme/index.ts`
- `src/components/Layout.tsx`
- `src/pages/Servers.tsx`
- `src/pages/Settings.tsx`

Rules:

- Prefer `Paper variant="outlined"` for framed surfaces.
- Use `Box`, `Grid`, and `gap` for layout.
- Use `Tooltip` around icon-only buttons.
- Use semantic MUI colors for status, success, warning, and error.
- Keep source UI copy in locale files instead of hardcoded strings when the surrounding page already uses i18n.
- Follow the project visual direction documented by the `ui-expert` agent.

### Theme and Color Mode

Pattern: theme definitions are centralized and selected through `ColorModeProvider`.

Examples:

- `src/theme/index.ts`
- `src/theme/ColorModeProvider.tsx`
- `src/main.tsx`

Rules:

- Add palette, typography, or component override changes in the theme when they are global.
- Use `useColorMode()` for mode-aware assets or component behavior.
- Store color mode in `localStorage`.
- Avoid hardcoded colors unless they are part of an existing theme convention or a narrowly scoped visual token.

### Detail Pages And Page-Owned Contracts

Pattern: page-only contracts stay close to their route but never inside the `.tsx` page module.

Examples:

- `src/pages/SharePage/shareInfo.interface.ts`
- `src/pages/Profile/rolePermissions.interface.ts`

Rules:

- Store each page-owned contract in its own `name.kind.ts` file beside the page.
- Move a contract into its feature only when the feature genuinely owns it or multiple consumers share it.
- Keep frontend contracts aligned with backend records and `docs/ENTITIES.md`.
- Do not create a page-local `types.ts` aggregation file.

### Form and Validation Pattern

Pattern: forms use controlled MUI fields, local validation helpers, explicit save handlers, and loading feedback.

Examples:

- `src/pages/Settings.tsx`
- `src/pages/NewServer.tsx`
- `src/pages/Login.tsx`

Rules:

- Validate before sending requests.
- Disable or show loading indicators during saves.
- Preserve unsaved form state unless the user explicitly discards it.
- Normalize request payloads before sending them through `api`.

### Testing Pattern

Pattern: Vitest and React Testing Library are used for frontend behavior.

Examples:

- `src/api.test.ts`
- `src/pages/Login.test.tsx`
- `src/pages/Servers.test.tsx`
- `src/setupTests.ts`

Rules:

- Test route/page behavior when user-visible interactions change.
- Test API client behavior when interceptors change.
- Prefer user-facing queries in React Testing Library tests.
- Run `npm run check:frontend-structure` through `npm run type-check` to reject inline contracts, named multi-export modules, executable barrels, missing directory entry files, `index.tsx`, non-rendering top-level component helpers, and forbidden catch-all modules.

## Change Checklist

When changing backend patterns:

1. Update this file.
2. Update `docs/ENTITIES.md` if data shape or persistence behavior changes.
3. Update affected tests or explain why no tests were needed.

When changing frontend patterns:

1. Update this file.
2. Update or create flow documentation when user journeys change.
3. Update locale files when user-facing copy changes.
4. Update permission docs and backend permission definitions when action visibility changes.
5. Verify new features have backend and frontend permission coverage before considering the implementation complete.

When adding a new pattern:

1. Document where it lives.
2. Explain when to use it.
3. Explain when not to use it.
4. Add a representative source file example.

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

- `UsersController` handles route decorators, request data, response status, and audit logging calls.
- `UsersService` owns password hashing, uniqueness checks, user updates, and not-found behavior.

Rules:

- Controllers should stay thin and delegate business decisions to services.
- Services should not depend on Express request/response objects.
- Throw Nest exceptions from services when the failure belongs to business/domain behavior.
- Keep DTO-like request shapes explicit, even when they are inline types.
- Prefer named DTO classes under `dto/` for mutation-heavy controllers so request shapes stay searchable and reusable.

### Repository Contract

Pattern: services depend on repository interfaces injected by tokens, not directly on TypeORM repositories or Mongoose models.

Examples:

- Tokens: `api/src/database/database.tokens.ts`
- Contracts: `api/src/users/user.repository.ts`, `api/src/swagger/swagger-project.repository.ts`
- Implementations: `repositories/mongo-*.repository.ts` and `repositories/typeorm-*.repository.ts`

Rules:

- Add or change fields in this order: entity/schema, repository contract, Mongo repository, TypeORM repository, service usage, docs.
- Keep repository return records stable across persistence backends.
- Map TypeORM `id` and Mongo `_id` consistently at repository boundaries.
- Keep JSON serialization/deserialization inside repository implementations, not services.
- Use separate read models for security-sensitive records when different use cases need different field visibility. For example, `SecretRecord` includes `value` for internal resolution, while API-facing list/read flows return metadata without `value`.
- Preserve server source tags as regular `tags` entries using the `source:<type>` format.

### Multi-Persistence Strategy

Pattern: `DatabaseModule.forRoot()` selects the persistence backend based on the `DATABASE` env var.

Supported values:

| `DATABASE` | Driver | Notes |
|---|---|---|
| `sqlite` (default) | TypeORM + better-sqlite3 | Local file, zero setup, `synchronize: true` |
| `mysql` | TypeORM + mysql2 | MySQL 8+ / MariaDB 10.6+, `DB_SYNC=true` required for schema sync |
| `postgres` / `postgresql` | TypeORM + pg | PostgreSQL 14+, `DB_SYNC=true` required for schema sync |
| `mongodb` | Mongoose | Separate Mongoose schema path, no TypeORM |

Examples:

- MongoDB path uses `MongooseModule.forRootAsync()` and `MongooseModule.forFeature()`.
- TypeORM path (SQLite/MySQL/PostgreSQL) uses `TypeOrmModule.forRoot()` and `TypeOrmModule.forFeature()`. The driver is selected by `buildTypeOrmOptions()` inside `DatabaseModule`.

Rules:

- Any domain entity must support all persistence paths unless the feature is intentionally backend-specific.
- Keep TypeORM entities and Mongoose schemas semantically aligned.
- Document differences in `docs/ENTITIES.md`.
- Avoid leaking database-specific types outside repositories.
- TypeORM repositories are driver-agnostic and prefixed `typeorm-*`. They work identically with SQLite, MySQL, and PostgreSQL.
- `DB_SYNC=true` is dangerous in production for MySQL and PostgreSQL — TypeORM may drop columns on schema divergence. Use migrations in production; rely on `DB_SYNC` only in development.
- Connection variables for MySQL/PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`.

### Guard and Decorator Authorization

Pattern: authentication and permissions are enforced through guards and metadata decorators.

Examples:

- `JwtAuthGuard`
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
- `JWT_SECRET` remains the bootstrap/fallback signing secret, but runtime token signing and verification should resolve through `JwtSecretService` so the Settings singleton can override it with the saved `jwtSecret` value.
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
- Pages in `src/pages/Servers/index.tsx`, `src/pages/ServerDetail/index.tsx`, `src/pages/Settings/index.tsx`, and related files.

Rules:

- Put route orchestration, page-specific data loading, and page-local UI state in page components.
- Store route pages in `src/pages/PageName/index.tsx`, not loose `src/pages/PageName.tsx` files.
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
- Feature barrels such as `src/features/server/index.tsx` and `src/features/secrets/index.tsx`

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
  types.ts
  constants.ts
  utils.ts
  index.tsx
```

Use only the folders a feature needs; small features can stay flat.

### Atomic Design

Pattern: shared reusable UI can follow Atomic Design when the component set grows across features.

Examples:

- Atoms: `src/components/atoms/HelpButton/index.tsx`, `src/components/atoms/SaveIndicator/index.tsx`
- Organisms: `src/components/organisms/BaseListCard/index.tsx`, `src/components/organisms/ConfirmDialog/index.tsx`
- Templates: `src/components/templates/BaseDialogLayout/index.tsx`, `src/components/templates/Layout/index.tsx`

Rules:

- Use atoms for domain-neutral primitives such as labels, status chips, badges, icon actions, field pieces, and compact indicators.
- Use molecules for composed controls such as search/filter bars, tag inputs, field rows, action clusters, and compact form groups.
- Use organisms for larger reusable sections such as panels, drawers, accordions, list cards, tables, and settings groups.
- Use templates for reusable page, drawer, or dialog layout shells that do not own domain behavior.
- Keep pages as route-level composition under `src/pages/`.
- Do not create `atoms/`, `molecules/`, `organisms/`, or `templates/` folders for one-off components; introduce them when shared UI volume justifies the structure.
- Keep atoms domain-neutral. If a component knows about servers, prompts, secrets, operations, or MCP details, it usually belongs in a feature.
- Store React components in `ComponentName/index.tsx` folders rather than loose `ComponentName.tsx` files when applying this architecture.

### Barrel Exports

Pattern: `index.tsx` files define controlled public APIs for React feature and shared component groups.

Examples:

- `src/components/index.tsx`
- `src/components/atoms/index.tsx`
- `src/features/server/index.tsx`
- `src/features/server/settings/index.tsx`
- `src/features/prompts/index.tsx`
- `src/features/secrets/index.tsx`

Rules:

- Use `index.tsx` barrels at feature or shared component boundaries when they make imports clearer.
- Export only stable public components, hooks, types, constants, and helpers.
- Prefer named exports and explicit type exports over broad `export *`.
- Avoid barrels in tiny folders with one file unless the folder is expected to grow.
- Avoid importing from a barrel inside the same folder when a direct relative import is clearer.
- Watch for circular dependencies; split modules or use direct imports if a barrel creates cycles.

### Server Detail Feature Modules

Pattern: `ServerDetail` should act as the server detail route orchestrator, while cohesive server sections live under `src/features/server/`.

Examples:

- `src/features/server/settings/RateLimitPanel.tsx`
- `src/features/server/types.ts`
- `src/components/SaveIndicator.tsx`

Rules:

- Keep page-level tab selection, project loading, navigation, and cross-tab state in `src/pages/ServerDetail.tsx`.
- Move self-contained panels, dialogs, accordions, and tab bodies into `src/features/server/<area>/`.
- Share feature-local types through `src/features/server/types.ts` only when more than one server feature module needs them.
- Put cross-feature UI widgets in `src/components/` only when they are not specific to server detail.
- Preserve current behavior while extracting modules; avoid combining extraction with product changes.

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
- `src/context/ServerNavContext.tsx`
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
- Let the response interceptor handle `401` logout/redirect behavior.
- Keep endpoint paths relative to `/api`.
- Fetch sensitive values through dedicated reveal endpoints instead of list/detail metadata endpoints.
- When creating servers from REST templates, send `tags: ['source:rest']` with the create request.

### Auth and Permission Context

Pattern: authentication state and permission checks are centralized in `AuthContext`.

Examples:

- `src/context/AuthContext.tsx`
- `Permission` enum mirrors backend permission keys.
- `can()` supports backend-provided permissions and role-based fallback.

Rules:

- Gate UI actions with `can(Permission.X)`.
- Keep frontend permission names aligned with backend `RolePermissions`.
- Keep role fallback presets in `src/context/permissionPresets.ts`.
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
- `src/theme/ColorModeContext.tsx`
- `src/main.tsx`

Rules:

- Add palette, typography, or component override changes in the theme when they are global.
- Use `useColorMode()` for mode-aware assets or component behavior.
- Store color mode in `localStorage`.
- Avoid hardcoded colors unless they are part of an existing theme convention or a narrowly scoped visual token.

### Detail Pages and Large Local Types

Pattern: complex pages define local TypeScript interfaces close to the workflow they support.

Example:

- `src/pages/ServerDetail.tsx`

Rules:

- Keep local interfaces near the page until they are reused.
- Extract shared API/domain types only when multiple pages or components need them.
- Keep frontend types aligned with backend records and `docs/ENTITIES.md`.

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

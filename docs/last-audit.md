# Last Audit Registry

> Tracks the last audit date for each source file under **Architecture** and **SOLID** criteria.
> Update the date column after completing a review cycle on that file.

**Legend:** `—` = never audited · Date format: `YYYY-MM-DD`

**Criteria in scope:**
- **Arch** — module boundaries, layer separation, dependency direction, naming conventions, cohesion, coupling, circular dependencies
- **SOLID** — SRP (single responsibility), OCP (open/closed), LSP (substitutability), ISP (interface segregation), DIP (dependency inversion)

---

## Backend — `api/src/`

### Root

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/main.ts` | Bootstrap & global middleware setup | — | — |
| `api/src/app.module.ts` | Root module — imports all feature modules | — | — |

---

### Config

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/config/configuration.ts` | Typed config factory | — | — |
| `api/src/config/env.validation.ts` | Env var schema validation (class-validator) | — | — |

---

### Database

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/database/database.module.ts` | DB module — conditional SQLite / MongoDB wiring | — | — |
| `api/src/database/database.tokens.ts` | Injection tokens for repository abstractions | — | — |

---

### Common

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/common/decorators/require-permission.decorator.ts` | Metadata decorator for RBAC permissions | — | — |
| `api/src/common/filters/mcp-exception.filter.ts` | Global exception filter for MCP errors | — | — |
| `api/src/common/filters/spa.filter.ts` | SPA fallback filter (serves index.html) | — | — |
| `api/src/common/guards/permissions.guard.ts` | RBAC permissions guard | — | — |

---

### Auth

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/auth/auth.module.ts` | Auth feature module | — | — |
| `api/src/auth/auth.controller.ts` | Login, logout, password reset endpoints | — | — |
| `api/src/auth/auth.service.ts` | Auth business logic (JWT issuance, validation) | — | — |
| `api/src/auth/jwt.strategy.ts` | Passport JWT strategy | — | — |
| `api/src/auth/jwt.guard.ts` | JWT auth guard | — | — |
| `api/src/auth/local.strategy.ts` | Passport local (username/password) strategy | — | — |
| `api/src/auth/local.guard.ts` | Local auth guard | — | — |
| `api/src/auth/password-reset.entity.ts` | TypeORM password reset token entity | — | — |
| `api/src/auth/password-reset.schema.ts` | Mongoose password reset token schema | — | — |
| `api/src/auth/password-reset.repository.ts` | Abstract repository interface | — | — |
| `api/src/auth/repositories/typeorm-password-reset.repository.ts` | TypeORM implementation | — | — |
| `api/src/auth/repositories/mongo-password-reset.repository.ts` | MongoDB implementation | — | — |

---

### Users

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/users/users.module.ts` | Users feature module | — | — |
| `api/src/users/users.controller.ts` | CRUD endpoints for user management | — | — |
| `api/src/users/users.service.ts` | User business logic | — | — |
| `api/src/users/user.entity.ts` | TypeORM user entity | — | — |
| `api/src/users/user.schema.ts` | Mongoose user schema | — | — |
| `api/src/users/user.repository.ts` | Abstract repository interface | — | — |
| `api/src/users/repositories/typeorm-user.repository.ts` | TypeORM implementation | — | — |
| `api/src/users/repositories/mongo-user.repository.ts` | MongoDB implementation | — | — |

---

### Roles

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/roles/roles.module.ts` | Roles feature module | — | — |
| `api/src/roles/roles.controller.ts` | CRUD endpoints for roles | — | — |
| `api/src/roles/roles.service.ts` | Role business logic | — | — |
| `api/src/roles/permissions.ts` | Permissions enum / constants | — | — |
| `api/src/roles/role.entity.ts` | TypeORM role entity | — | — |
| `api/src/roles/role.schema.ts` | Mongoose role schema | — | — |
| `api/src/roles/role.repository.ts` | Abstract repository interface | — | — |
| `api/src/roles/repositories/typeorm-role.repository.ts` | TypeORM implementation | — | — |
| `api/src/roles/repositories/mongo-role.repository.ts` | MongoDB implementation | — | — |

---

### Settings

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/settings/settings.module.ts` | Settings feature module | — | — |
| `api/src/settings/settings.controller.ts` | CRUD endpoints for platform settings | — | — |
| `api/src/settings/settings.service.ts` | Settings business logic | — | — |
| `api/src/settings/jwt-secret.service.ts` | JWT secret derivation service | — | — |
| `api/src/settings/settings.entity.ts` | TypeORM settings entity | — | — |
| `api/src/settings/settings.schema.ts` | Mongoose settings schema | — | — |
| `api/src/settings/settings.repository.ts` | Abstract repository interface | — | — |
| `api/src/settings/repositories/typeorm-settings.repository.ts` | TypeORM implementation | — | — |
| `api/src/settings/repositories/mongo-settings.repository.ts` | MongoDB implementation | — | — |

---

### Secrets

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/secrets/secrets.module.ts` | Secrets feature module | — | — |
| `api/src/secrets/secrets.controller.ts` | CRUD endpoints for secrets | — | — |
| `api/src/secrets/secrets.service.ts` | Secret business logic (encryption) | — | — |
| `api/src/secrets/secret.entity.ts` | TypeORM secret entity | — | — |
| `api/src/secrets/secret.schema.ts` | Mongoose secret schema | — | — |
| `api/src/secrets/secret.repository.ts` | Abstract repository interface | — | — |
| `api/src/secrets/repositories/typeorm-secret.repository.ts` | TypeORM implementation | — | — |
| `api/src/secrets/repositories/mongo-secret.repository.ts` | MongoDB implementation | — | — |

---

### Prompts

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/prompts/prompts.module.ts` | Prompts feature module | — | — |
| `api/src/prompts/prompts.controller.ts` | CRUD endpoints for prompts | — | — |
| `api/src/prompts/prompts.service.ts` | Prompt business logic | — | — |
| `api/src/prompts/prompt.entity.ts` | TypeORM prompt entity | — | — |
| `api/src/prompts/prompt.schema.ts` | Mongoose prompt schema | — | — |
| `api/src/prompts/prompt.repository.ts` | Abstract repository interface | — | — |
| `api/src/prompts/repositories/typeorm-prompt.repository.ts` | TypeORM implementation | — | — |
| `api/src/prompts/repositories/mongo-prompt.repository.ts` | MongoDB implementation | — | — |

---

### Swagger / API Import

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/swagger/swagger.module.ts` | Swagger feature module | — | — |
| `api/src/swagger/swagger.controller.ts` | Import, manage, list Swagger projects | — | — |
| `api/src/swagger/swagger.service.ts` | Swagger project business logic | — | — |
| `api/src/swagger/swagger-import.service.ts` | OpenAPI spec ingestion logic | — | — |
| `api/src/swagger/swagger-api-keys.service.ts` | Per-project API key management | — | — |
| `api/src/swagger/postman-parser.ts` | Postman collection → OpenAPI converter | — | — |
| `api/src/swagger/swagger-project.entity.ts` | TypeORM swagger project entity | — | — |
| `api/src/swagger/swagger-project.schema.ts` | Mongoose swagger project schema | — | — |
| `api/src/swagger/swagger-project.repository.ts` | Abstract repository interface | — | — |
| `api/src/swagger/repositories/typeorm-swagger-project.repository.ts` | TypeORM implementation | — | — |
| `api/src/swagger/repositories/mongo-swagger-project.repository.ts` | MongoDB implementation | — | — |
| `api/src/swagger/dto/swagger.dto.ts` | Request/response DTOs | — | — |

---

### Dynamic MCP

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/dynamic-mcp/dynamic-mcp.module.ts` | MCP core feature module | — | — |
| `api/src/dynamic-mcp/dynamic-mcp.controller.ts` | MCP protocol endpoints | — | — |
| `api/src/dynamic-mcp/dynamic-mcp.service.ts` | MCP session orchestration | — | — |
| `api/src/dynamic-mcp/types.ts` | Shared type definitions | — | — |
| `api/src/dynamic-mcp/openapi-parser.ts` | Parses OpenAPI spec to MCP tool definitions | — | — |
| `api/src/dynamic-mcp/tool-generator.ts` | Generates MCP tool descriptors | — | — |
| `api/src/dynamic-mcp/schema-converter.ts` | JSON Schema ↔ MCP schema conversion | — | — |
| `api/src/dynamic-mcp/param-builder.ts` | Builds request parameters from tool input | — | — |
| `api/src/dynamic-mcp/request-builder.ts` | Constructs HTTP requests from MCP calls | — | — |
| `api/src/dynamic-mcp/response-mapper.ts` | Maps HTTP responses to MCP tool results | — | — |
| `api/src/dynamic-mcp/http-client.ts` | HTTP client wrapper for upstream calls | — | — |
| `api/src/dynamic-mcp/auth-provider.ts` | Auth injection into MCP requests | — | — |
| `api/src/dynamic-mcp/mcp-api-key.guard.ts` | MCP API key validation guard | — | — |
| `api/src/dynamic-mcp/project-state.guard.ts` | Validates project is active guard | — | — |
| `api/src/dynamic-mcp/rate-limit.guard.ts` | Per-project rate limiting guard | — | — |
| `api/src/dynamic-mcp/adapters/sql.adapter.ts` | SQL data source MCP adapter | — | — |
| `api/src/dynamic-mcp/adapters/mongodb.adapter.ts` | MongoDB data source MCP adapter | — | — |
| `api/src/dynamic-mcp/adapters/redis.adapter.ts` | Redis data source MCP adapter | — | — |
| `api/src/dynamic-mcp/adapters/index.ts` | Adapter barrel export | — | — |

---

### AI Providers

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/ai-providers/ai-providers.module.ts` | AI providers feature module | — | — |
| `api/src/ai-providers/ai-providers.controller.ts` | CRUD endpoints for AI provider configs | — | — |
| `api/src/ai-providers/ai-providers.service.ts` | AI provider business logic | — | — |
| `api/src/ai-providers/ai-provider.entity.ts` | TypeORM entity | — | — |
| `api/src/ai-providers/ai-provider.schema.ts` | Mongoose schema | — | — |
| `api/src/ai-providers/ai-provider.repository.ts` | Abstract repository interface | — | — |
| `api/src/ai-providers/repositories/typeorm-ai-provider.repository.ts` | TypeORM implementation | — | — |
| `api/src/ai-providers/repositories/mongo-ai-provider.repository.ts` | MongoDB implementation | — | — |
| `api/src/ai-providers/dto/create-ai-provider.dto.ts` | Create DTO | — | — |
| `api/src/ai-providers/dto/update-ai-provider.dto.ts` | Update DTO | — | — |

---

### Error Tracking

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/error-tracking/error-tracking.module.ts` | Error tracking feature module | — | — |
| `api/src/error-tracking/error-tracking.controller.ts` | CRUD + simulate error endpoints | — | — |
| `api/src/error-tracking/error-tracking.service.ts` | Provider config & event forwarding | — | — |
| `api/src/error-tracking/error-tracking-provider.entity.ts` | TypeORM entity | — | — |
| `api/src/error-tracking/error-tracking-provider.schema.ts` | Mongoose schema | — | — |
| `api/src/error-tracking/error-tracking-provider.repository.ts` | Abstract repository interface | — | — |
| `api/src/error-tracking/repositories/typeorm-error-tracking-provider.repository.ts` | TypeORM implementation | — | — |
| `api/src/error-tracking/repositories/mongo-error-tracking-provider.repository.ts` | MongoDB implementation | — | — |
| `api/src/error-tracking/dto/create-error-tracking-provider.dto.ts` | Create DTO | — | — |
| `api/src/error-tracking/dto/update-error-tracking-provider.dto.ts` | Update DTO | — | — |
| `api/src/error-tracking/dto/simulate-error.dto.ts` | Simulate error DTO | — | — |

---

### Audit Logs

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/audit-logs/audit-logs.module.ts` | Audit logs feature module | — | — |
| `api/src/audit-logs/audit-logs.controller.ts` | Audit log query endpoints | — | — |
| `api/src/audit-logs/audit-logs.service.ts` | Audit event recording & retrieval | — | — |

---

### Execution Logs

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/execution-logs/execution-logs.module.ts` | Execution logs feature module | — | — |
| `api/src/execution-logs/execution-logs.controller.ts` | Execution log query endpoints | — | — |
| `api/src/execution-logs/execution-logs.service.ts` | Log persistence & retrieval | — | — |

---

### Dashboard

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/dashboard/dashboard.module.ts` | Dashboard feature module | — | — |
| `api/src/dashboard/dashboard.controller.ts` | Aggregate stats endpoints | — | — |
| `api/src/dashboard/dashboard.service.ts` | Dashboard aggregation logic | — | — |

---

### Share

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/share/share.module.ts` | Share feature module | — | — |
| `api/src/share/share.controller.ts` | Public share page serving | — | — |

---

### OAuth

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/oauth/oauth.module.ts` | OAuth feature module | — | — |
| `api/src/oauth/oauth.controller.ts` | OAuth flow endpoints (authorize, callback, token) | — | — |
| `api/src/oauth/oauth.service.ts` | OAuth client credential management | — | — |

---

### Email

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/email/email.module.ts` | Core email module | — | — |
| `api/src/email/email-features.module.ts` | Email feature composition module | — | — |
| `api/src/email/email.service.ts` | Email sending abstraction | — | — |
| `api/src/email/digest.service.ts` | Digest email scheduling & building | — | — |

---

### Health

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/health/health.module.ts` | Health check module | — | — |
| `api/src/health/health.controller.ts` | `/health` liveness & readiness endpoints | — | — |

---

### Logging

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/logging/logging.module.ts` | Logging infrastructure module | — | — |
| `api/src/logging/logging.service.ts` | Structured log service | — | — |
| `api/src/logging/json-logger.ts` | JSON-format logger implementation | — | — |
| `api/src/logging/mcp-logging.interceptor.ts` | NestJS interceptor — logs MCP calls | — | — |

---

### Observability

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `api/src/observability/observability.module.ts` | Observability feature module | — | — |
| `api/src/observability/health.controller.ts` | Health sub-controller under observability | — | — |
| `api/src/observability/metrics.controller.ts` | Prometheus metrics exposition endpoint | — | — |
| `api/src/observability/metrics/metrics.service.ts` | Metrics collection & registration | — | — |
| `api/src/observability/metrics/prometheus.registry.ts` | Prometheus registry singleton | — | — |
| `api/src/observability/interceptors/metrics.interceptor.ts` | HTTP metrics interceptor | — | — |
| `api/src/observability/interceptors/tracing.interceptor.ts` | OpenTelemetry tracing interceptor | — | — |
| `api/src/observability/logger/app-logger.service.ts` | Application-level logger service | — | — |
| `api/src/observability/logger/request-logger.middleware.ts` | Request/response logging middleware | — | — |
| `api/src/observability/middlewares/correlation-id.middleware.ts` | Injects/propagates correlation ID header | — | — |
| `api/src/observability/tracing/otel.config.ts` | OpenTelemetry SDK configuration | — | — |
| `api/src/observability/tracing/tracing.service.ts` | Tracing span management service | — | — |

---

## Frontend — `src/`

### Entry Points

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/main.tsx` | Vite entry point — React root mount | — | — |
| `src/App.tsx` | Router tree + layout shell | — | — |
| `src/api.ts` | Axios instance + typed API client | — | — |
| `src/i18n.ts` | i18next initialization | — | — |
| `src/index.css` | Global CSS reset / tokens | — | — |
| `src/vite-env.d.ts` | Vite env type declarations | — | — |
| `src/setupTests.ts` | Vitest global test setup | — | — |

---

### Theme

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/theme/index.ts` | MUI theme definition | — | — |
| `src/theme/ColorModeContext.tsx` | Light/dark mode context | — | — |

---

### Context

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/context/AuthContext.tsx` | Auth state & session management context | — | — |
| `src/context/ServerNavContext.tsx` | Server detail navigation context | — | — |
| `src/context/permissionPresets.ts` | Permission preset constants | — | — |

---

### Hooks

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/hooks/useAsyncFeedback.ts` | Async op feedback (loading/error/success) hook | — | — |
| `src/hooks/useCopyToClipboard.ts` | Clipboard copy with feedback hook | — | — |
| `src/hooks/useDetailPageNav.ts` | Detail page tab navigation hook | — | — |
| `src/hooks/useListPageLogic.ts` | List page common logic (filter, pagination) hook | — | — |

---

### Utils

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/utils/sourceType.ts` | Source type enum & label helpers | — | — |

---

### Data

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/data/api-templates.ts` | Built-in API template definitions | — | — |
| `src/data/prompt-templates.ts` | Built-in prompt template definitions | — | — |

---

### Components — Atoms

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/components/atoms/index.tsx` | Atoms barrel export | — | — |
| `src/components/atoms/AppSnackbar/index.tsx` | Global snackbar notification atom | — | — |
| `src/components/atoms/CodePreviewTabs/index.tsx` | Tabbed code preview atom | — | — |
| `src/components/atoms/HelpButton/index.tsx` | Help tooltip button atom | — | — |
| `src/components/atoms/SaveIndicator/index.tsx` | Save status indicator atom | — | — |

---

### Components — Organisms

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/components/organisms/index.tsx` | Organisms barrel export | — | — |
| `src/components/organisms/BaseListCard/index.tsx` | Reusable list card base organism | — | — |
| `src/components/organisms/ConfirmDialog/index.tsx` | Generic confirm/cancel dialog organism | — | — |

---

### Components — Templates

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/components/templates/index.tsx` | Templates barrel export | — | — |
| `src/components/templates/BaseDialogLayout/index.tsx` | Standard dialog layout template | — | — |
| `src/components/templates/Layout/index.tsx` | App shell layout template (nav + sidebar) | — | — |

---

### Features — AI Providers

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/aiProviders/index.tsx` | AI providers feature barrel | — | — |
| `src/features/aiProviders/types.ts` | Feature-local types | — | — |
| `src/features/aiProviders/AiProviderCard/index.tsx` | Provider list card component | — | — |

---

### Features — Error Tracking

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/errorTracking/index.tsx` | Error tracking feature barrel | — | — |
| `src/features/errorTracking/types.ts` | Feature-local types | — | — |
| `src/features/errorTracking/ErrorTrackingProviderCard/index.tsx` | Provider list card component | — | — |

---

### Features — Observability

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/observability/index.tsx` | Observability feature barrel | — | — |
| `src/features/observability/types.ts` | Feature-local types | — | — |
| `src/features/observability/environment-controls.ts` | Environment toggle logic | — | — |
| `src/features/observability/ObservabilityEnvironmentPanel/index.tsx` | Environment config panel | — | — |
| `src/features/observability/ObservabilityProviderCard/index.tsx` | Provider list card component | — | — |
| `src/features/observability/TechnicalObservabilityPanel/index.tsx` | Technical metrics/traces panel | — | — |

---

### Features — Prompts

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/prompts/index.tsx` | Prompts feature barrel | — | — |
| `src/features/prompts/types.ts` | Feature-local types | — | — |
| `src/features/prompts/PromptCard/index.tsx` | Prompt list card component | — | — |
| `src/features/prompts/TagInput/index.tsx` | Tag input field component | — | — |

---

### Features — Secrets

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/secrets/index.tsx` | Secrets feature barrel | — | — |
| `src/features/secrets/types.ts` | Feature-local types | — | — |
| `src/features/secrets/SecretCard/index.tsx` | Secret list card component | — | — |
| `src/features/secrets/SecretAutocomplete/index.tsx` | Secret autocomplete selector | — | — |

---

### Features — Server (Activity)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/activity/index.tsx` | Activity tab barrel | — | — |
| `src/features/server/activity/ProjectLogs/index.tsx` | Real-time project execution logs panel | — | — |

---

### Features — Server (API Endpoints)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/api-endpoints/index.tsx` | API endpoints feature barrel | — | — |
| `src/features/server/api-endpoints/ApiEndpointsTab/index.tsx` | Tab container for API endpoints | — | — |
| `src/features/server/api-endpoints/EndpointAccordion/index.tsx` | Collapsible endpoint item | — | — |
| `src/features/server/api-endpoints/ToolAccordion/index.tsx` | Collapsible tool item | — | — |
| `src/features/server/api-endpoints/ToolDialog/index.tsx` | Tool create/edit dialog | — | — |
| `src/features/server/api-endpoints/ToolCommentsSection/index.tsx` | Tool-level comments section | — | — |
| `src/features/server/api-endpoints/ToolOutputTemplateSection/index.tsx` | Output template editor section | — | — |
| `src/features/server/api-endpoints/FieldInput/index.tsx` | Schema field input component | — | — |
| `src/features/server/api-endpoints/FromEndpointPickerDialog/index.tsx` | Pick endpoint from import dialog | — | — |
| `src/features/server/api-endpoints/ReimportSpecDialog/index.tsx` | Re-import OpenAPI spec dialog | — | — |
| `src/features/server/api-endpoints/curl-utils.ts` | cURL command generation utilities | — | — |
| `src/features/server/api-endpoints/tool-form-utils.ts` | Tool form helpers | — | — |

---

### Features — Server (Chains)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/chains/index.tsx` | Chains feature barrel | — | — |
| `src/features/server/chains/ChainsTab/index.tsx` | Tab container for chains | — | — |
| `src/features/server/chains/ChainDialog/index.tsx` | Chain create/edit dialog | — | — |
| `src/features/server/chains/StepBuilder/index.tsx` | Chain step builder component | — | — |

---

### Features — Server (Connect)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/connect/index.tsx` | Connect tab barrel | — | — |
| `src/features/server/connect/McpEndpointBar/index.tsx` | MCP endpoint display bar | — | — |
| `src/features/server/connect/ApiKeysPanel/index.tsx` | API key management panel | — | — |
| `src/features/server/connect/OAuthClientPanel/index.tsx` | OAuth client config panel | — | — |

---

### Features — Server (Guard Rails)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/guardRails/index.tsx` | Guard rails feature barrel | — | — |
| `src/features/server/guardRails/GuardRailsTab/index.tsx` | Tab container for guard rails | — | — |
| `src/features/server/guardRails/InputConstraintsPanel/index.tsx` | Input constraints config panel | — | — |
| `src/features/server/guardRails/OutputFilteringPanel/index.tsx` | Output filtering config panel | — | — |
| `src/features/server/guardRails/ToolRestrictionsPanel/index.tsx` | Tool restriction config panel | — | — |

---

### Features — Server (Harness)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/harness/index.tsx` | Harness feature barrel | — | — |
| `src/features/server/harness/HarnessTab/index.tsx` | Tab container for execution harness | — | — |
| `src/features/server/harness/ExecutionHooksPanel/index.tsx` | Pre/post execution hooks panel | — | — |
| `src/features/server/harness/RetryPolicyPanel/index.tsx` | Retry policy config panel | — | — |
| `src/features/server/harness/TimeoutPanel/index.tsx` | Timeout config panel | — | — |

---

### Features — Server (Prompts)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/prompts/index.tsx` | Server prompts feature barrel | — | — |
| `src/features/server/prompts/PromptsTab/index.tsx` | Tab container for server prompts | — | — |
| `src/features/server/prompts/PromptTestPanel/index.tsx` | Interactive prompt testing panel | — | — |

---

### Features — Server (Resources)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/resources/index.tsx` | Resources feature barrel | — | — |
| `src/features/server/resources/ResourcesTab/index.tsx` | Tab container for MCP resources | — | — |
| `src/features/server/resources/DynamicResourceDialog/index.tsx` | Dynamic resource create/edit dialog | — | — |
| `src/features/server/resources/ResourceTestPanel/index.tsx` | Interactive resource testing panel | — | — |

---

### Features — Server (Settings)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/settings/index.tsx` | Server settings feature barrel | — | — |
| `src/features/server/settings/BaseUrlPanel/index.tsx` | Base URL config panel | — | — |
| `src/features/server/settings/AuthConfigPanel/index.tsx` | Auth config panel | — | — |
| `src/features/server/settings/RateLimitPanel/index.tsx` | Rate limit config panel | — | — |
| `src/features/server/settings/AlertConfigPanel/index.tsx` | Alert config panel | — | — |
| `src/features/server/settings/TenantConfigPanel/index.tsx` | Tenant config panel | — | — |
| `src/features/server/settings/ProjectControlsPanel/index.tsx` | Project enable/disable controls | — | — |
| `src/features/server/settings/InlineEdit/index.tsx` | Inline editable field component | — | — |

---

### Features — Server (Shared)

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/index.tsx` | Server feature barrel | — | — |
| `src/features/server/types.ts` | Feature-wide shared types | — | — |
| `src/features/server/constants.ts` | Feature-wide constants | — | — |
| `src/features/server/ProjectCard/index.tsx` | Server list card component | — | — |

---

### Features — Global Settings

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/settings/index.tsx` | Global settings feature barrel | — | — |
| `src/features/settings/GlobalRequestHeadersPanel/index.tsx` | Global request headers config panel | — | — |

---

### Pages

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/pages/Dashboard/index.tsx` | Dashboard overview page | — | — |
| `src/pages/Login/index.tsx` | Login page | — | — |
| `src/pages/ForgotPassword/index.tsx` | Forgot password page | — | — |
| `src/pages/ResetPassword/index.tsx` | Reset password page | — | — |
| `src/pages/SetupWizard/index.tsx` | First-run setup wizard page | — | — |
| `src/pages/Profile/index.tsx` | User profile page | — | — |
| `src/pages/Settings/index.tsx` | Global settings page | — | — |
| `src/pages/Servers/index.tsx` | Server list page | — | — |
| `src/pages/NewServer/index.tsx` | New server creation page | — | — |
| `src/pages/ServerDetail/index.tsx` | Server detail tabbed page | — | — |
| `src/pages/Prompts/index.tsx` | Prompt list page | — | — |
| `src/pages/NewPrompt/index.tsx` | New prompt creation page | — | — |
| `src/pages/PromptDetail/index.tsx` | Prompt detail page | — | — |
| `src/pages/PromptTemplates/index.tsx` | Prompt template gallery page | — | — |
| `src/pages/Templates/index.tsx` | API template gallery page | — | — |
| `src/pages/Secrets/index.tsx` | Secret list page | — | — |
| `src/pages/NewSecret/index.tsx` | New secret creation page | — | — |
| `src/pages/SecretDetail/index.tsx` | Secret detail page | — | — |
| `src/pages/AiProviders/index.tsx` | AI provider list page | — | — |
| `src/pages/NewAiProvider/index.tsx` | New AI provider creation page | — | — |
| `src/pages/AiProviderDetail/index.tsx` | AI provider detail page | — | — |
| `src/pages/ErrorTracking/index.tsx` | Error tracking list page | — | — |
| `src/pages/NewErrorTrackingProvider/index.tsx` | New error tracking provider page | — | — |
| `src/pages/ErrorTrackingProviderDetail/index.tsx` | Error tracking provider detail page | — | — |
| `src/pages/Observability/index.tsx` | Observability list page | — | — |
| `src/pages/NewObservabilityProvider/index.tsx` | New observability provider page | — | — |
| `src/pages/ObservabilityProviderDetail/index.tsx` | Observability provider detail page | — | — |
| `src/pages/AuditLogs/index.tsx` | Audit logs page | — | — |
| `src/pages/Upload/index.tsx` | Spec upload page | — | — |
| `src/pages/McpDocs/index.tsx` | MCP docs / reference page | — | — |
| `src/pages/SharePage/index.tsx` | Public project share page | — | — |

---

## Not Tracked

The following are excluded from audit tracking (generated, config, or non-architectural):

- `api/src/**/*.spec.ts` — test files (covered implicitly by the service/controller they test)
- `api/src/templates/*.hbs` — Handlebars view templates
- `src/locales/**/*.json` — i18n translation files
- `src/components/index.tsx`, `src/features/*/index.tsx` (barrel-only) — already noted per feature
- `api/.env`, `api/.env.example`, `api/nest-cli.json`, `api/package.json` — config artifacts
- `vite.config.ts`, `tsconfig*.json`, `.eslintrc*`, `Dockerfile*`, `docker-compose*.yml` — tooling config

---

## New Files — Pending Classification

> Files added after the initial audit. Classify and move to the appropriate section after review.

| File | Role | Last Arch Audit | Last SOLID Audit |
|------|------|:-:|:-:|
| `src/features/server/settings/ResponseLimitPanel/index.tsx` | — | — | — |

# Handoff

Update this file at the end of each work session. The goal is to let Codex or Claude Code resume the project without relying on external memory.

## Last Agent

Codex

## Current State

The shared context protocol now includes Claude Code specialist agents, backend entity documentation, backend/frontend design patterns, flow documentation, and a documentation gate. Recent Claude Code work added frontend i18n and configurable terminology. REST server templates now create tagged REST servers by sending `source:rest` during server creation. Prompt and secret creation now use dedicated page-based stepper flows. Server source cards now support double-click to select and continue. A Portuguese integration modeling document was added by explicit user request. Phase 1 of the operation-first migration renamed generic data-source execution UI from Queries to Operations. Data-source operations now support input/output schemas for MCP exposure, with input parameters presented before source-specific query/command editors. A `system-tutor` Claude Code specialist now owns tutorials, section guides, onboarding paths, and product education. A `compliance-counsel` specialist now owns software licensing, dependency obligations, attribution, distribution risk, and compliance/legal notes. A `developer-advocate` specialist now owns developer adoption materials, demos, examples, DX reviews, and community feedback loops. A `react-frontend-engineer` specialist now owns React/TypeScript frontend implementation. A `backend-test-engineer` specialist now owns backend Jest, NestJS, repository, guard, DTO, and API/e2e tests. Backend coverage now has an 80% global gate for focused testable units. `ServerDetail` refactoring is continuing by extracting focused server feature modules without replacing the current Operations implementation.

## Latest Changes

- Added `AGENTS.md` with project context, commands, and the agent protocol.
- Added `docs/ROADMAP.md` with macro status, decisions, and open questions.
- Added `docs/HANDOFF.md` as the handoff file between sessions.
- Converted the shared context files to English.
- Added `.claude/agents/README.md` as the Claude Code agent index.
- Updated `AGENTS.md` with the Claude Code specialist list and routing guidance.
- Added `docs/ENTITIES.md` documenting backend entities, persistence fields, and repository contracts.
- Translated existing Portuguese backend comments/log/error text found while documenting entities.
- Added a documentation gate requiring every code or configuration change to update affected documentation in the same work session.
- Added `docs/DESIGN_PATTERNS.md` documenting backend and frontend design patterns.
- Updated `AGENTS.md` and `docs/ROADMAP.md` to reference the design pattern document.
- Aligned `SwaggerProject` Mongo persistence with the repository contract by adding `connectionConfig` and `dbQueries`.
- Split secret metadata from secret value reveal at the service/API/UI boundary.
- Added permission guards to secrets endpoints.
- Centralized backend built-in permission presets and frontend fallback permission presets.
- Added Swagger DTO contracts and extracted import/API-key responsibilities into focused services.
- Added `docs/FLOWS.md` with the Secrets Vault flow.
- Documented frontend i18n, supported locale resources, language detection, and configurable terminology settings.
- Recorded `tool-instructor` and `naming-expert` as Claude Code specialists in the shared agent index.
- Updated REST API templates so every template-created server receives the `source:rest` tag.
- Added `NewPrompt` and `NewSecret` pages so primary creation follows the same page/stepper pattern as `NewServer`.
- Added double-click behavior to source cards in `NewServer`: single-click selects, double-click selects and advances to Details.
- Added Claude Code `software-engineer` and `software-architect` specialists and updated the shared agent indexes.
- Added `docs/INTEGRATION_MODEL.pt-BR.md`, documenting how APIs, protocols, relational databases, NoSQL/document stores, and cloud/analytics integrations should be modeled.
- Renamed the generic data-source backed UI language in `ServerDetail` from Queries to Operations while preserving legacy `DbQuery` storage and `/queries` API routes.
- Added `inputSchema` and `outputSchema` to operation/`DbQuery` contracts; operation Tools inherit those schemas when created.
- Operation input parameters can now be added manually in the UI and are treated as GET-like inputs that become variables and generate the operation `inputSchema`.
- Moved the operation input parameters section before SQL/query/command editors and replaced the table-style editor with compact parameter rows.
- Added Claude Code `system-tutor` specialist and registered it in the shared agent indexes.
- Added Claude Code `compliance-counsel` specialist and registered it in the shared agent indexes.
- Added Claude Code `developer-advocate` specialist and registered it in the shared agent indexes.
- Added Claude Code `react-frontend-engineer` specialist and registered it in the shared agent indexes.
- Added Claude Code `backend-test-engineer` specialist and registered it in the shared agent indexes.
- Added backend Jest coverage for audit logs, settings, dashboard, prompts, Swagger API keys, email, OAuth, MCP API key guard, project state guard, rate limit guard, schema conversion, parameter building, and tool generation.
- Configured `api/package.json` coverage collection and global thresholds: 80% statements, 70% branches, 80% functions, and 80% lines.
- Found Claude Code worktree at `.claude/worktrees/agent-ab0722d25387f1c7f`. It compiles and contains a broad `ServerDetail` split, but it is based on an older state and does not include the current Operations/`DbQuery` UI, so do not copy it wholesale into the main worktree.
- Extracted shared `SaveIndicator` and `RateLimitPanel` from `ServerDetail` into focused frontend modules.
- Reviewed the frontend modularity problem with `react-frontend-engineer`, `software-engineer`, and `software-architect` guidance. `ServerDetail.tsx` remains the primary SOLID violation and should continue to be decomposed by route feature area.
- Extracted `BaseUrlPanel` from `ServerDetail.tsx` into `src/features/server/settings/BaseUrlPanel.tsx`, keeping the route page as the caller and preserving existing API behavior.
- Inspected Claude Code worktree `.claude/worktrees/agent-ab0722d25387f1c7f`; it contains a broad server feature split but should still be reused selectively because the main tree has newer Operations/i18n work.
- Reused the worktree's project-controls extraction pattern and moved `ProjectControlsPanel` from inline `ServerDetail.tsx` code into `src/features/server/settings/ProjectControlsPanel.tsx`.
- Extracted the Connect tab from `ServerDetail.tsx` into `src/features/server/connect/McpEndpointBar.tsx`, `ApiKeysPanel.tsx`, and `OAuthClientPanel.tsx`, preserving the current `serverDetail` i18n usage instead of copying the older hardcoded worktree versions.
- Extracted the Activity log panel from `ServerDetail.tsx` into `src/features/server/activity/ProjectLogs.tsx`, with `ExecLog` moved to shared server feature types.
- Started the API endpoint extraction by moving `FromEndpointPickerDialog` into `src/features/server/api-endpoints/FromEndpointPickerDialog.tsx` and adding shared server constants/types needed by that module.
- Extracted `ToolCommentsSection` from `ServerDetail.tsx` into `src/features/server/api-endpoints/ToolCommentsSection.tsx`.
- Extracted `buildCurl`, `buildMcpCurl`, and `inferSchema` from `ServerDetail.tsx` into `src/features/server/api-endpoints/curl-utils.ts`.
- Extracted `EndpointAccordion` from `ServerDetail.tsx` into `src/features/server/api-endpoints/EndpointAccordion.tsx`, preserving the main tree's i18n copy instead of using the older hardcoded worktree text.
- Extracted shared schema field rendering into `src/features/server/api-endpoints/FieldInput.tsx`; `ServerDetail` still imports it for the remaining `ToolAccordion` path.
- Imported pending uncommitted changes from Claude worktree `.claude/worktrees/agent-ab0722d25387f1c7f` into `develop`.
- Added modular files from the worktree split, including API endpoint tabs/tool dialogs, chains tab/dialog, prompts tab, resources tab, and shared UI helpers such as `CodePreviewTabs` and `InlineEdit`.

## Files Changed In This Session

- `AGENTS.md`
- `.claude/agents/README.md`
- `.claude/agents/backend-test-engineer.md`
- `.claude/agents/compliance-counsel.md`
- `.claude/agents/developer-advocate.md`
- `.claude/agents/react-frontend-engineer.md`
- `.claude/agents/software-architect.md`
- `.claude/agents/software-engineer.md`
- `.claude/agents/system-tutor.md`
- `api/package.json`
- `api/src/audit-logs/audit-logs.controller.spec.ts`
- `api/src/audit-logs/audit-logs.service.spec.ts`
- `api/src/auth/auth.service.ts`
- `api/src/dashboard/dashboard.controller.spec.ts`
- `api/src/dashboard/dashboard.service.spec.ts`
- `api/src/dynamic-mcp/dynamic-mcp.service.ts`
- `api/src/dynamic-mcp/mcp-api-key.guard.spec.ts`
- `api/src/dynamic-mcp/openapi-parser.ts`
- `api/src/dynamic-mcp/param-builder.extra.spec.ts`
- `api/src/dynamic-mcp/param-builder.ts`
- `api/src/dynamic-mcp/project-state.guard.spec.ts`
- `api/src/dynamic-mcp/rate-limit.guard.spec.ts`
- `api/src/dynamic-mcp/schema-converter.spec.ts`
- `api/src/dynamic-mcp/tool-generator.spec.ts`
- `api/src/dynamic-mcp/types.ts`
- `api/src/email/email.service.spec.ts`
- `api/src/oauth/oauth.service.spec.ts`
- `api/src/prompts/prompts.controller.spec.ts`
- `api/src/prompts/prompts.service.spec.ts`
- `api/src/common/guards/permissions.guard.ts`
- `api/src/roles/permissions.ts`
- `api/src/roles/roles.service.ts`
- `api/src/secrets/secret.repository.ts`
- `api/src/secrets/secrets.controller.ts`
- `api/src/secrets/secrets.service.ts`
- `api/src/secrets/secrets.service.spec.ts`
- `api/src/settings/settings.schema.ts`
- `api/src/settings/settings.entity.ts`
- `api/src/settings/settings.repository.ts`
- `api/src/settings/repositories/mongo-settings.repository.ts`
- `api/src/settings/repositories/sqlite-settings.repository.ts`
- `api/src/settings/settings.controller.spec.ts`
- `api/src/settings/settings.service.spec.ts`
- `api/src/swagger/dto/swagger.dto.ts`
- `api/src/swagger/swagger-api-keys.service.ts`
- `api/src/swagger/swagger-api-keys.service.spec.ts`
- `api/src/swagger/swagger-import.service.ts`
- `api/src/swagger/swagger-project.schema.ts`
- `api/src/swagger/swagger.controller.ts`
- `api/src/swagger/swagger.module.ts`
- `api/src/swagger/swagger.service.spec.ts`
- `api/src/swagger/swagger.service.ts`
- `src/data/api-templates.ts`
- `src/components/SaveIndicator.tsx`
- `src/features/server/settings/RateLimitPanel.tsx`
- `src/features/server/settings/BaseUrlPanel.tsx`
- `src/features/server/settings/ProjectControlsPanel.tsx`
- `src/features/server/connect/McpEndpointBar.tsx`
- `src/features/server/connect/ApiKeysPanel.tsx`
- `src/features/server/connect/OAuthClientPanel.tsx`
- `src/features/server/activity/ProjectLogs.tsx`
- `src/features/server/api-endpoints/FromEndpointPickerDialog.tsx`
- `src/features/server/api-endpoints/ToolCommentsSection.tsx`
- `src/features/server/api-endpoints/curl-utils.ts`
- `src/features/server/api-endpoints/EndpointAccordion.tsx`
- `src/features/server/api-endpoints/FieldInput.tsx`
- `src/features/server/constants.ts`
- `src/features/server/types.ts`
- `src/components/SecretAutocomplete.tsx`
- `src/context/AuthContext.tsx`
- `src/context/TerminologyContext.tsx`
- `src/context/permissionPresets.ts`
- `src/i18n.ts`
- `src/locales/`
- `src/locales/en/prompts.json`
- `src/locales/en/secrets.json`
- `src/locales/pt-BR/prompts.json`
- `src/locales/pt-BR/secrets.json`
- `src/pages/NewPrompt.tsx`
- `src/pages/NewSecret.tsx`
- `src/pages/NewServer.tsx`
- `src/pages/ServerDetail.tsx`
- `src/locales/en/serverDetail.json`
- `src/locales/pt-BR/serverDetail.json`
- `src/pages/SecretDetail.tsx`
- `src/pages/Secrets.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Templates.tsx`
- `src/App.tsx`
- `src/pages/Prompts.tsx`
- `docs/DESIGN_PATTERNS.md`
- `docs/ENTITIES.md`
- `docs/FLOWS.md`
- `docs/INTEGRATION_MODEL.pt-BR.md`
- `docs/ROADMAP.md`
- `docs/HANDOFF.md`

## Validation

- `npx tsc -p api/tsconfig.json --noEmit` passed.
- `npm run type-check` passed.
- `npm run type-check` passed after extracting `SaveIndicator` and `RateLimitPanel`.
- `npm run type-check` passed after extracting `BaseUrlPanel`.
- `npm run type-check` passed after extracting `ProjectControlsPanel`.
- `npm run type-check` passed after extracting the Connect tab panels.
- `npm run type-check` passed after extracting the Activity log panel.
- `npm run type-check` passed after extracting `FromEndpointPickerDialog`.
- `npm run type-check` passed after extracting `ToolCommentsSection`.
- `npm run type-check` passed after extracting API endpoint curl/schema helpers.
- `npm run type-check` passed after extracting `EndpointAccordion` and `FieldInput`.
- `npm run type-check` passed after importing pending worktree files into `develop`.
- `npm test --prefix api -- secrets.service.spec.ts swagger.service.spec.ts permissions.guard.spec.ts` passed.
- `npm run test:cov --prefix api -- --runInBand` passed with 83.85% statements, 71.72% branches, 87.34% functions, and 85.35% lines.
- `npm run build --prefix api` could not complete because the local system hit the file watcher limit (`ENOSPC`), so backend validation used direct `tsc --noEmit` instead.

## Recommended Next Step

Continue the `ServerDetail` modular refactor in small behavior-preserving steps. Use the Claude Code worktree as a reference, but do not merge it wholesale. The next high-value extraction is likely API endpoint accordions/tool dialog, resources/prompts, or the Operations area.

## Points Of Attention

- Do not overwrite existing uncommitted changes.
- There are local changes in several frontend screens, `api/src/secrets/secrets.controller.ts`, `package-lock.json`, and `api/database.sqlite`.
- There are untracked Claude Code agent files in `.claude/agents/`, untracked i18n/terminology files, plus untracked `src/pages/PromptDetail.tsx` and `src/pages/SecretDetail.tsx`.
- Locale files under `src/locales/pt-BR/` intentionally contain Portuguese translations; project docs, comments, identifiers, and translation keys should remain English.

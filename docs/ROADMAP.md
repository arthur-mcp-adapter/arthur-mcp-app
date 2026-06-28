# Roadmap

This file should be updated when task state changes. It does not replace issues or commits; it is a quick map for any agent to resume work.

## Now

- [ ] Confirm the current product goal and record details that still exist only in conversation.
- [ ] Review existing uncommitted changes before starting a new task.
- [ ] Keep `docs/HANDOFF.md` updated at the end of each Codex or Claude Code session.
- [ ] Enforce the documentation gate for every code or configuration change.

## In Progress

- [ ] Audit permission coverage for newly added feature domains and integrations:
  - [ ] Verify frontend permissions for AI providers and error tracking are present in backend `RolePermissions` and backend built-in role presets.
  - [x] Verify observability permissions are present in backend `RolePermissions` and backend/frontend role presets; `/observability` uses `observability_view` only for the runtime dashboard.
  - [ ] Verify every new page/tab/action added during frontend expansion has an explicit permission decision and matching backend/frontend enforcement.
- [ ] Apply frontend code duplication optimization plan (`docs/FRONTEND_OPTIMIZATION_PLAN.md`):
  - [x] **Phase 1:** Create `BaseListCard` generic component and refactor `PromptCard`, `SecretCard`, `ProjectCard` (4–6 hours, ~60 lines saved per card).
  - [x] **Phase 2:** Extract `useListPageLogic` hook and refactor list pages (Prompts, Secrets, Servers).
  - [x] **Phase 3:** Extract `useCopyToClipboard` utility hook and migrate Prompts, Secrets.
  - [x] **Phase 4:** Create `BaseDialogLayout` for dialog/drawer wrappers and migrate shared drawer shells.
  - [x] **Phase 5:** Extract `useDetailPageNav` hook for detail page contextual navigation.
  - [x] **Phase 6:** Consolidate type definitions.
  - [x] **Phase 7:** Extract `useAsyncFeedback` hook.
- [ ] Apply frontend architecture migration plan (`docs/FRONTEND_ARCHITECTURE_PLAN.md`) to align the UI with Feature-Driven Architecture, Atomic Design, and controlled barrel exports.
  - [x] **Phase 1:** Added explicit feature/shared component `index.tsx` barrels and rewired current imports to use public APIs.
  - [x] **Atomic Design first slice:** Organized shared components into `atoms`, `organisms`, and `templates`, moved components into `ComponentName/index.tsx` folders, and moved `SecretAutocomplete` into the `secrets` feature.
  - [x] **Pages structure slice:** Moved route pages into `PageName/index.tsx` folders and colocated page tests.
  - [ ] **Phase 2:** Thin the largest route pages, starting with `NewServer.tsx`.
  - [ ] Continue the server feature i18n sweep through the remaining credential help copy and `AuthConfigPanel` text.
- [ ] Verify observability behavior in a deployed Render free instance after the next deployment:
  - [ ] Confirm `/health`, `/ready`, `/live`, and `/metrics` respond without the `/api` prefix.
  - [ ] Confirm Render log output is structured JSON with request IDs.
  - [ ] Confirm Prometheus can scrape the deployed `/metrics` endpoint when network access allows it.

## Later

- [ ] Document the main system flows, including MCP server creation/import, prompts, secrets, audit, and sharing.
- [ ] Record important architectural decisions as they come up.
- [ ] Create or complete tests in the most frequently changed areas.

## Done

- [x] Identified the main project structure: React/Vite frontend at the repository root and NestJS backend in `api/`.
- [x] Created the base files for shared memory between agents.
- [x] Documented backend entities and persistence shapes in `docs/ENTITIES.md`.
- [x] Documented backend and frontend design patterns in `docs/DESIGN_PATTERNS.md`.
- [x] Documented the Secrets Vault flow in `docs/FLOWS.md`.
- [x] Documented frontend i18n and configurable terminology behavior.
- [x] Ensured REST server templates create servers with the `source:rest` tag.
- [x] Standardized prompt and secret creation around page-based stepper flows.
- [x] Added Claude Code `backend-test-engineer` specialist for backend Jest, NestJS, repository, guard, and API/e2e tests.
- [x] Added Claude Code `software-engineer` and `software-architect` specialists.
- [x] Added Claude Code `compliance-counsel` specialist for software licensing, dependency obligations, and compliance risk.
- [x] Added Claude Code `developer-advocate` specialist for developer adoption, examples, demos, and DX feedback.
- [x] Added Claude Code `react-frontend-engineer` specialist for React/TypeScript frontend implementation.
- [x] Added Claude Code `system-tutor` specialist for user-facing tutorials and section guides.
- [x] Added Claude Code `gof-expert` specialist for Gang of Four design pattern selection, naming, refactoring, and misuse review.
- [x] Added Claude Code `solid-expert` specialist for SOLID responsibility, interface, dependency direction, substitutability, and maintainability review.
- [x] Prepared frontend Claude Code specialists to use Feature-Driven Architecture, Atomic Design, and controlled barrel exports.
- [x] Added `docs/FRONTEND_ARCHITECTURE_PLAN.md` with an incremental plan for Feature-Driven Architecture, Atomic Design, and barrel exports.
- [x] Completed the first frontend architecture migration slice by adding feature/component `index.tsx` barrels and organizing shared/feature components into folder entry points.
- [x] Aligned route pages with the folder entry-point convention by moving pages to `src/pages/<PageName>/index.tsx`.
- [x] Added a Portuguese integration modeling document by explicit user request.
- [x] Completed phase 1 of the operation-first migration by renaming user-facing data-source execution UI from Queries to Operations.
- [x] Added input/output schema support to data-source operations and MCP Tool generation.
- [x] Added backend tests and an 80% coverage gate for focused backend testable units.
- [x] Started the `ServerDetail` SOLID refactor by extracting shared save status UI and the rate limit settings panel.
- [x] Continued the `ServerDetail` modular refactor by extracting the API base URL settings panel into `src/features/server/settings/`.
- [x] Reused the Claude Code worktree selectively to extract the server project controls panel into `src/features/server/settings/`.
- [x] Extracted the server Connect tab panels into `src/features/server/connect/` while preserving current i18n copy.
- [x] Extracted the server Activity log panel into `src/features/server/activity/`.
- [x] Started extracting API endpoint support by moving the endpoint picker dialog into `src/features/server/api-endpoints/`.
- [x] Extracted tool notes/comments UI into `src/features/server/api-endpoints/`.
- [x] Created comprehensive `docs/FRONTEND_OPTIMIZATION_PLAN.md` to reduce ~35-40% frontend code duplication across 7 phases.
- [x] **Phase 1 Complete:** Implemented `BaseListCard` generic card component and migrated `PromptCard`, `SecretCard`, `ProjectCard` to use it.
- [x] Extracted API endpoint curl/schema helper functions into `src/features/server/api-endpoints/`.
- [x] Continued the Claude Code worktree refactor by extracting `EndpointAccordion` and shared schema field input into `src/features/server/api-endpoints/`.
- [x] Completed the remaining `ServerDetail` settings extraction by moving alert and tenant panels into `src/features/server/settings/` and wiring the page to consume only feature modules.
- [x] Modularized the `Prompts` route by extracting prompt card and tag input components into `src/features/prompts/` and removing the unused inline drawer implementation.
- [x] Modularized the `Secrets` route by extracting the secret card into `src/features/secrets/` and removing the unused inline drawer implementation.
- [x] Started modularizing the `Settings` route by extracting the global headers and terminology panels into `src/features/settings/`.
- [x] Extracted the `Servers` list card into `src/features/server/ProjectCard.tsx` and moved server health-summary types into shared feature types.
- [x] Switched `ServerDetail` to the shared contextual sidebar navigation pattern so the back action and section tabs are driven by `ServerNavContext` instead of duplicated inline UI.
- [x] Switched `Profile` to the shared contextual sidebar navigation pattern so profile sections are selected from the sidebar instead of inline tabs.
- [x] **Phase 1 Complete:** Implemented `BaseListCard` generic card component and migrated `PromptCard`, `SecretCard`, `ProjectCard` to use it (~390 lines eliminated).
- [x] **Phase 2 Complete:** Extracted `useListPageLogic` hook and refactored `Prompts`, `Secrets`, `Servers` list pages (~240 lines eliminated).
- [x] **Phase 3 Complete:** Extracted `useCopyToClipboard` hook and migrated `Prompts`, `Secrets` pages (~80 lines eliminated).
- [x] **Phase 4 Complete:** Extracted `BaseDialogLayout` and refactored shared right-drawer shells in `FromEndpointPickerDialog` and `ReimportSpecDialog`.
- [x] **Phase 5 Complete:** Extracted `useDetailPageNav` and refactored `PromptDetail`, `SecretDetail`, `ServerDetail`, and `Profile` to use the shared contextual nav sync.
- [x] **Phase 6 Complete:** Replaced local prompt/secret/project detail interfaces with shared feature types in `PromptDetail` and `SecretDetail`.
- [x] **Phase 7 Complete:** Extracted `useAsyncFeedback` and reused it for the repeated snackbar feedback flows in `Profile`.
- [x] Replaced hardcoded instructional/status copy in `SetupWizard`, `Upload`, and `SaveIndicator` with i18n keys in `auth`, `servers`, and `common` locales.
- [x] Replaced hardcoded chain/prompt testing and code-preview tab copy in server feature modules with `serverDetail`/`common` i18n keys.
- [x] Replaced the main hardcoded resource dialog, tool template section, tool dialog, and OAuth client panel copy with `serverDetail`/`common` i18n keys, and repaired the related locale namespaces.
- [x] Added an observability-ready backend layer with public health/readiness/liveness endpoints, structured logs, Prometheus metrics, optional OpenTelemetry tracing, correlation IDs, MCP technical metrics, Render defaults, and local Prometheus/Grafana/Tempo helper files.
- [x] Reworked the Observability UI from provider CRUD into a runtime observability dashboard aligned with `/health`, `/ready`, `/live`, `/metrics`, structured logs, OpenTelemetry env vars, and the local Prometheus/Grafana/Tempo stack.

## Decisions

- Use versioned files in the repository as the shared context source.
- Use `AGENTS.md` for stable context, `docs/ROADMAP.md` for planning, and `docs/HANDOFF.md` for handoff.
- Do not rely on Codex or Claude Code internal memory for continuity.
- Keep project documentation and source comments/log messages in English.
- Keep locale translation values under `src/locales/<locale>/` in the target language; translation keys stay in English.
- Treat documentation updates as part of every change whenever behavior, data, commands, infrastructure, flows, or agent workflow are affected.
- Treat permissions as part of feature design and implementation. New pages, tabs, endpoints, integrations, credential surfaces, settings panels, and user actions must explicitly reuse an existing permission or add a new permission across backend contracts, backend role presets, frontend permission types, frontend fallback presets, UI gates, tests, and documentation.
- Use `docs/DESIGN_PATTERNS.md` as the reference for backend and frontend implementation patterns.
- Sensitive values must use explicit reveal flows; metadata endpoints should not expose secret values.
- User-facing copy should use i18n namespaces when the surrounding page has been migrated to translations.
- Server templates in `API_TEMPLATES` are REST templates and must create servers with `source:rest`.
- Primary entity creation should use dedicated `new` routes with stepper/review flows, following `NewServer`.
- The Portuguese document `docs/INTEGRATION_MODEL.pt-BR.md` is an explicit exception to the English documentation rule.
- During the compatibility phase, user-facing UI should say `Operations` while legacy backend names may still use `DbQuery` and `/queries`.
- Data-source operations should define schemas before being exposed as MCP Tools or Resources; Tools inherit operation schemas when available.
- Technical observability endpoints are intentionally public operational surfaces, not user-facing product actions, and do not require role permissions.
- The `/observability` app page is permission-gated with `observability_view`; provider create/edit/delete routes are not part of the current observability implementation and redirect to the runtime dashboard.

## Open Questions

- What is the immediate functional priority for the system?
- Is there a primary deploy environment beyond the files already present in the repository?
- Which excluded legacy backend facades should receive dedicated coverage next?
- Which `ServerDetail` section should be extracted next: API endpoint accordions/tool dialog, resources/prompts, or operations?

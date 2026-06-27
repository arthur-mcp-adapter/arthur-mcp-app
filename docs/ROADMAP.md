# Roadmap

This file should be updated when task state changes. It does not replace issues or commits; it is a quick map for any agent to resume work.

## Now

- [ ] Confirm the current product goal and record details that still exist only in conversation.
- [ ] Review existing uncommitted changes before starting a new task.
- [ ] Keep `docs/HANDOFF.md` updated at the end of each Codex or Claude Code session.
- [ ] Enforce the documentation gate for every code or configuration change.

## In Progress

- [ ] Establish a shared context protocol between agents.
- [ ] Refactor `ServerDetail` into focused `src/features/server/` modules while preserving current Operations behavior.

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
- [x] Extracted API endpoint curl/schema helper functions into `src/features/server/api-endpoints/`.
- [x] Continued the Claude Code worktree refactor by extracting `EndpointAccordion` and shared schema field input into `src/features/server/api-endpoints/`.

## Decisions

- Use versioned files in the repository as the shared context source.
- Use `AGENTS.md` for stable context, `docs/ROADMAP.md` for planning, and `docs/HANDOFF.md` for handoff.
- Do not rely on Codex or Claude Code internal memory for continuity.
- Keep project documentation and source comments/log messages in English.
- Keep locale translation values under `src/locales/<locale>/` in the target language; translation keys stay in English.
- Treat documentation updates as part of every change whenever behavior, data, commands, infrastructure, flows, or agent workflow are affected.
- Use `docs/DESIGN_PATTERNS.md` as the reference for backend and frontend implementation patterns.
- Sensitive values must use explicit reveal flows; metadata endpoints should not expose secret values.
- User-facing copy should use i18n namespaces when the surrounding page has been migrated to translations.
- Server templates in `API_TEMPLATES` are REST templates and must create servers with `source:rest`.
- Primary entity creation should use dedicated `new` routes with stepper/review flows, following `NewServer`.
- The Portuguese document `docs/INTEGRATION_MODEL.pt-BR.md` is an explicit exception to the English documentation rule.
- During the compatibility phase, user-facing UI should say `Operations` while legacy backend names may still use `DbQuery` and `/queries`.
- Data-source operations should define schemas before being exposed as MCP Tools or Resources; Tools inherit operation schemas when available.

## Open Questions

- What is the immediate functional priority for the system?
- Is there a primary deploy environment beyond the files already present in the repository?
- Which excluded legacy backend facades should receive dedicated coverage next?
- Which `ServerDetail` section should be extracted next: API endpoint accordions/tool dialog, resources/prompts, or operations?

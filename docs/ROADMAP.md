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

- [x] Imported pending uncommitted Claude worktree changes from `.claude/worktrees/agent-ab0722d25387f1c7f` into `develop`, including modular tabs and dialogs for API endpoints, resources, prompts, and chains.

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

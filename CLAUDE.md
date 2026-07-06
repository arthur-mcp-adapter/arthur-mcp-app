# CLAUDE.md

Full shared project memory (protocol, documentation gate, specialist index) lives in `AGENTS.md` — read it at session start:

@AGENTS.md

## Quick reference

**Arthur MCP** — self-hostable control plane for building/operating MCP servers from APIs, databases, prompts, resources, and internal tools.

- Monorepo: repo root = React 18 + Vite + TypeScript frontend; `api/` = NestJS backend.
- Persistence: SQLite by default, MongoDB optional via `DATABASE` env var (repository pattern with injection tokens).
- Backend domains: `api/src/dynamic-mcp/` (MCP tool generation/execution), `api/src/swagger/` (OpenAPI/Postman import), `api/src/auth/`, `api/src/prompts/`, `api/src/secrets/`, `api/src/settings/`, `api/src/users/`, `api/src/roles/`, `api/src/observability/`.
- Frontend: `src/pages/`, `src/components/`, `src/context/`, `src/i18n.ts` + `src/locales/`, `src/theme/`.

### Commands

| Task | Command |
|---|---|
| Install deps (frontend/backend) | `npm install` / `npm install --prefix api` |
| Dev (both) | `npm run dev` |
| Dev frontend / backend only | `npm run start` / `npm run start:dev --prefix api` |
| Build frontend / backend | `npm run build` / `npm run build --prefix api` |
| Type-check frontend | `npm run type-check` |
| Test frontend | `npm test` |
| Test backend / e2e | `npm test --prefix api` / `npm run test:e2e --prefix api` |
| Backend coverage gate | `npm run test:cov --prefix api -- --runInBand` |

There is no lint script configured (`eslint` is a devDependency but no `eslint.config.*`/`lint` script exists yet); Prettier formatting is defined in `.prettierrc`.

### Topic-scoped conventions

Backend, frontend, and permission-gate conventions are split into `.claude/rules/` (auto-loaded only for matching paths) instead of duplicated here — see `.claude/rules/backend.md`, `.claude/rules/frontend.md`, and `.claude/rules/permissions.md`.

### Non-negotiables (always apply)

- Database schema/data-shape changes go through migrations — never `synchronize`, manual DB edits, or implicit startup sync.
- Every new page, tab, API endpoint, integration, credential surface, or settings panel must make an explicit permission decision (reuse or add end-to-end) — see `.claude/rules/permissions.md`.
- Documentation is part of the deliverable: update `AGENTS.md`, `docs/ROADMAP.md`, `docs/HANDOFF.md`, `docs/ENTITIES.md`, `docs/DESIGN_PATTERNS.md`, or `docs/FLOWS.md` when the area they cover changes.
- Project docs, code identifiers, and translation keys stay in English; only `src/locales/<locale>/` values are translated.

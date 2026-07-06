---
description: NestJS backend conventions — modules, repositories, migrations, guards, observability, testing
paths:
  - "api/**"
---

# Backend Rules

Full pattern catalog: `docs/DESIGN_PATTERNS.md` (Backend Patterns section). Entity/persistence reference: `docs/ENTITIES.md`.

## Architecture

- One NestJS module per domain; keep controllers, services, repositories, entities, and schemas close to their domain.
- Controllers stay thin (HTTP concerns only); services own business behavior and throw Nest exceptions for domain failures.
- Services depend on repository **interfaces** injected by tokens (`api/src/database/database.tokens.ts`), never directly on TypeORM repositories.
- Add/change a persisted field in this order: entity → repository contract → TypeORM repository → service usage → `docs/ENTITIES.md`.
- Any domain entity must support all three drivers (SQLite/Postgres/MySQL) unless intentionally backend-specific.

## Migrations (non-negotiable)

- All schema/data-shape changes ship through explicit TypeORM migrations. Never use `synchronize`, `DB_SYNC`, startup sync, or manual edits to local database files.
- Commit the entity/repository change and its migration together, then update `docs/ENTITIES.md`.

## Authorization

- Use guards for route access decisions, decorators (`RequirePermission`) for declarative requirements.
- Keep permission names aligned with `RolePermissions` (`api/src/roles/permissions.ts`) and frontend `Permission` (`src/context/`).
- New endpoint/action → reuse an existing permission intentionally or add one end-to-end (see `.claude/rules/permissions.md`).

## Error tracking & observability

- Route caught exceptions through `ErrorTrackingService.captureBackendError(...)`; never send raw bodies, cookies, auth headers, API keys, or secret values.
- `/health`, `/ready`, `/live`, `/metrics` stay public operational endpoints — do not gate them behind permissions.
- Use `MetricsService`/`TracingService.runInSpan()` instead of ad hoc counters/spans in feature modules.

## Testing

- Test pure functions directly; test services with mocked repository contracts; add e2e tests when route wiring/guards/module integration is the risk.
- Validate with `npm test --prefix api` (focused) or `npm run test:cov --prefix api -- --runInBand` (coverage gate: 80% statements/functions/lines, 70% branches).

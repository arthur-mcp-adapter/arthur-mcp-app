# Supabase Adoption Plan

> **Override (2026-07-14):** the Auth migration this document defers to Phase 6 below was executed now, by explicit user decision, alongside the managed-PostgreSQL adoption rather than after it. Supabase Auth is the sole identity provider — the local `users`/`password_resets` tables, local JWT/password login, and Passport OAuth strategies have been removed (legacy tables pending a final drop migration). See `docs/FLOWS.md`'s "Authentication (Supabase)" section and `docs/ENTITIES.md`'s "Identity (Supabase Auth)" section for the resulting architecture. The "Explicit Non-Goals" item below about not running two competing identity systems indefinitely is resolved by removing the local system entirely, not by declining Supabase Auth. The rest of this document (managed PostgreSQL as the current phase, RLS/Realtime/Storage/Edge Functions still deferred) remains the plan going forward and is left intact below as the original rationale.

## Purpose

This document evaluates how Supabase can support Arthur MCP and defines a phased adoption path. The recommended approach is to adopt Supabase first as managed PostgreSQL infrastructure while preserving the existing NestJS, TypeORM, authentication, and permission architecture.

Supabase should solve concrete operational or product needs. It should not introduce a parallel backend, duplicate authorization model, or second schema-management workflow without a clear benefit.

## Current Context

Arthur MCP currently uses:

- NestJS as the authoritative backend API and business-logic boundary.
- TypeORM repositories selected through `DATABASE_URI`.
- SQLite for zero-setup local development, with PostgreSQL and MySQL support.
- Explicit TypeORM migrations with `synchronize` disabled.
- Custom JWT and Passport authentication, including Google and GitHub OAuth.
- Application roles and permissions enforced authoritatively by backend guards and mirrored in the frontend.
- Repository abstractions that keep database-specific details outside domain services.

Any Supabase adoption must preserve these constraints unless a separate architecture decision explicitly replaces them.

## Recommended Uses

### 1. Managed PostgreSQL

The highest-value and lowest-disruption use of Supabase is as the managed PostgreSQL database for production.

Arthur MCP already supports PostgreSQL connection strings through TypeORM, so this can provide:

- Durable production persistence.
- Better concurrent access than SQLite.
- Support for multiple backend replicas.
- Managed backups and centralized database administration.
- PostgreSQL indexes, query planning, full-text search, extensions, and JSON capabilities.
- A foundation for later Supabase features without requiring them immediately.

NestJS should remain the application API. It should connect to Supabase PostgreSQL using a server-side database connection with TLS and the connection mode appropriate for a long-running NestJS process.

### 2. Row Level Security

PostgreSQL Row Level Security can add defense in depth for tenant- and owner-scoped data, including:

- MCP servers and their tools, resources, prompts, and operations.
- Secrets and provider configurations.
- Audit and execution logs.
- User, organization, or workspace data.

RLS must not replace Arthur MCP's guards, permission decorators, role presets, or frontend permission gates. Backend authorization remains authoritative.

The current TypeORM connection does not automatically carry the requesting user's Supabase identity. Effective RLS would require a deliberate per-request strategy, such as transaction-scoped identity or workspace context, restricted database roles, or selected access through the Supabase Data API. RLS should therefore be introduced only after the tenant/workspace model and trust boundaries are explicit.

Every RLS rollout must test:

- Authenticated access by an authorized owner or workspace member.
- Unauthenticated access.
- Insufficient application permission.
- Cross-user access.
- Cross-workspace access.
- Read, insert, update, and delete policies independently.

### 3. Realtime Operational Updates

Supabase Realtime could reduce frontend polling and improve operational feedback for:

- MCP execution logs.
- Audit events.
- Provider test status.
- Long-running execution progress.
- Server or tool changes made by another session.

The first pilot should target execution logs or another append-oriented operational stream. The pilot must measure event volume, authorization behavior, reconnection handling, subscription cleanup, and cost before Realtime expands to additional areas.

### 4. Storage

Supabase Storage can support future persistent file use cases such as:

- Imported OpenAPI or Postman source files.
- Files exposed through MCP Resources.
- Server logos and images.
- Generated artifacts and exports.
- Temporary downloadable reports.

Private buckets should be the default. Access should use scoped policies or short-lived signed URLs. Bucket definitions, file-size limits, MIME-type restrictions, and policies must be versioned. Credentials, API keys, database URLs, and raw secret values must never be stored in public buckets.

### 5. Authentication

Supabase Auth could eventually replace parts of the current identity implementation, including:

- Registration and login.
- Email confirmation and password recovery.
- Google and GitHub OAuth.
- Session and refresh-token management.
- Multi-factor authentication.

This is not recommended as an initial adoption step. Arthur MCP already has users, password reset, JWT issuance, OAuth strategies, roles, and permissions. Migrating identity would require a dedicated plan covering existing users, password compatibility, OAuth identities, token transition, role mapping, permission claims, logout, rollback, and active-session invalidation.

There must be one authoritative identity source. Supabase Auth and the current JWT system should not operate as competing authentication systems indefinitely.

### 6. Edge Functions

Edge Functions may be appropriate for small, isolated, and idempotent workloads such as:

- External webhook receivers.
- Transactional email triggers.
- Short event-driven integrations.
- Temporary asset or link generation.
- Lightweight scheduled automation.

Core controllers, domain services, permission decisions, and MCP execution should remain in NestJS. Moving these concerns to Edge Functions would split the backend architecture and duplicate authorization, testing, observability, and deployment responsibilities.

## Additional PostgreSQL Opportunities

After moving production persistence to Supabase PostgreSQL, evaluate:

- Native `jsonb` for fields currently represented through cross-driver JSON text conventions, only when the project intentionally accepts PostgreSQL-specific persistence.
- Targeted indexes for ownership, workspace, slug, status, foreign keys, and time-based log queries.
- PostgreSQL full-text search for servers, tools, prompts, and documentation.
- `pgvector` for semantic discovery of tools, prompts, resources, and integration templates.
- Retention and partitioning strategies for high-volume audit and execution logs.

These are separate optimizations. None should be bundled into the initial database-hosting migration without measured need.

## Target Architecture

The initial target architecture is:

```text
React frontend
      |
      v
NestJS API
  - JWT/Passport authentication
  - Arthur MCP roles and permissions
  - Domain services and repository contracts
  - TypeORM migrations
      |
      v
Supabase managed PostgreSQL
```

Optional Supabase services should be added around this core only when justified:

```text
Supabase Realtime  -> selected operational subscriptions
Supabase Storage   -> private application files
Supabase RLS       -> database-level defense in depth
Edge Functions     -> isolated webhooks or small automations
Supabase Auth      -> possible future identity migration
```

## Adoption Phases

### Phase 0: Decision and Prerequisites

- Confirm whether Supabase Cloud or a self-hosted Supabase deployment is intended.
- Define production region, availability, recovery-point objective, recovery-time objective, and budget.
- Confirm data residency and compliance requirements.
- Inventory database size, expected connection count, write volume, and log-retention requirements.
- Decide whether production will standardize on PostgreSQL and stop treating MySQL as an equivalent deployment target.
- Assign ownership for migrations, backups, restore testing, access control, and incident response.

### Phase 1: Managed PostgreSQL Pilot

- Create separate development or staging and production Supabase projects.
- Configure server-side `DATABASE_URI` without exposing credentials to the frontend.
- Select and document the correct direct or pooled connection endpoint for the NestJS runtime.
- Apply the complete TypeORM migration history to an empty Supabase database.
- Load representative non-sensitive test data.
- Run backend tests and exercise authentication, permissions, server creation, secrets, prompts, sharing, logs, and provider configuration.
- Verify TLS, time zones, UUID behavior, indexes, transaction handling, and migration startup failure behavior.
- Test backup and restore before production use.

### Phase 2: Production Database Migration

- Define a maintenance or dual-write strategy appropriate to the accepted downtime.
- Back up the current production database.
- Migrate and verify row counts, relationships, timestamps, JSON fields, unique constraints, and sensitive-data handling.
- Switch the NestJS deployment to the Supabase PostgreSQL connection.
- Run smoke tests and monitor errors, latency, pool utilization, slow queries, and failed migrations.
- Keep a time-bounded rollback path to the previous database until validation is complete.

### Phase 3: Realtime Pilot

- Select one operational screen, preferably execution logs.
- Define the event authorization model.
- Implement subscription lifecycle, reconnection, deduplication, and fallback behavior.
- Measure volume, latency, reliability, and cost.
- Expand only if the pilot improves the user experience without weakening access control.

### Phase 4: Storage

- Introduce Storage only when a persistent file use case is approved.
- Define private buckets, paths, ownership, MIME types, size limits, retention, and deletion behavior.
- Add policies and signed-URL handling.
- Document backup, lifecycle, and orphan cleanup.

### Phase 5: RLS Defense in Depth

- Finalize the workspace and ownership data model.
- Define the user-to-database identity propagation strategy.
- Create a permission matrix for every protected table and operation.
- Deliver policies through migrations.
- Add negative integration tests for cross-user and cross-workspace access.
- Confirm privileged backend tasks use narrowly scoped elevation.

### Phase 6: Auth Evaluation

- Compare the operational cost of the existing auth system with a Supabase Auth migration.
- Prototype role and permission mapping without changing production identity.
- Prepare user, OAuth identity, session, and rollback migration plans.
- Proceed only after an explicit architecture decision.

## Migration Ownership

Arthur MCP must retain one authoritative schema history.

For the initial managed PostgreSQL adoption:

- TypeORM migrations remain authoritative for application tables.
- `synchronize` remains disabled.
- Dashboard-only schema changes are prohibited.
- Manual production SQL must not become the delivery path for schema changes.
- Supabase-specific schemas, RLS policies, grants, extensions, functions, publications, and Storage configuration must also be versioned.

Before introducing Supabase CLI migrations, choose and document how they coexist with TypeORM. Do not maintain duplicate migrations that create or alter the same application objects.

## Security Requirements

- Never expose database credentials, service-role keys, secret keys, JWT secrets, or privileged function secrets to the browser.
- Use frontend publishable keys only for explicitly approved Supabase client features protected by correct RLS and least-privilege grants.
- Keep Arthur MCP backend guards authoritative.
- Use private schemas or revoke Data API access for backend-only tables where direct browser access is unnecessary.
- Review views, database functions, triggers, and `security definer` functions for privilege escalation.
- Avoid privileged clients merely to bypass incomplete policies.
- Keep secrets out of logs, fixtures, migration output, error tracking, and committed environment files.
- Apply explicit authorization to Realtime, Storage, RPC, and Edge Function surfaces.

## Explicit Non-Goals for Initial Adoption

- Replacing NestJS with Edge Functions.
- Connecting the React frontend directly to every database table.
- Replacing Arthur MCP roles and permissions with RLS alone.
- Running the current JWT system and Supabase Auth as permanent competing identity sources.
- Maintaining TypeORM and Supabase migrations for the same schema changes.
- Introducing Realtime, Storage, RLS, Auth, and Edge Functions in the first database migration.
- Moving application secrets into public database or Storage surfaces.

## Success Criteria

The first adoption milestone is successful when:

- Arthur MCP runs against Supabase PostgreSQL without application behavior regressions.
- All migrations apply cleanly to a fresh database.
- Authentication and permission tests pass unchanged or with explicitly documented adaptations.
- Sensitive values remain server-side.
- Backup and restore have been tested.
- Database latency, connections, and failure behavior are observable.
- A rollback procedure has been documented and exercised in staging.

Later Supabase features should define their own measurable success criteria before implementation.

## Recommendation

Adopt Supabase incrementally:

1. Use managed PostgreSQL first.
2. Improve PostgreSQL indexing and operational practices based on measurements.
3. Pilot Realtime for execution logs.
4. Add Storage when persistent file requirements exist.
5. Add RLS after the workspace identity model is explicit.
6. Evaluate Supabase Auth as a separate architecture migration.
7. Reserve Edge Functions for isolated integrations rather than core backend logic.

This sequence provides immediate production value while protecting the existing NestJS architecture and avoiding an unnecessary platform rewrite.

## Official References

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase data security](https://supabase.com/docs/guides/database/secure-data)
- [Local development with schema migrations](https://supabase.com/docs/guides/local-development/overview)
- [Supabase local development and CLI](https://supabase.com/docs/guides/local-development)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)

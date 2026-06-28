# AGENTS.md

This file is the shared project memory for Codex, Claude Code, and any other development agent. Before changing code, read this file, `docs/ROADMAP.md`, and `docs/HANDOFF.md`.

## Product

Arthur MCP is a full-stack application for managing MCP servers/projects, importing API definitions, generating dynamic tools, handling prompts, secrets, logs, settings, sharing, and documentation.

## Stack

- Frontend: React 18, TypeScript, Vite, Material UI, React Router, Axios, react-i18next/i18next, Vitest.
- Backend: NestJS, TypeScript, TypeORM, local SQLite, Mongo/Mongoose in parts of the domain, JWT/Passport, Jest.
- Local runtime: frontend at the repository root and API in `api/`.
- Deploy/infra: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, and `render.yaml`.

## Structure

- `src/`: React frontend.
- `src/pages/`: main application screens.
- `src/components/`: reusable components.
- `src/context/`: React contexts, including auth, terminology, and server navigation.
- `src/i18n.ts`: frontend i18next initialization and language detection.
- `src/locales/`: frontend translation resources by locale and namespace.
- `src/theme/`: theme and color mode.
- `api/src/`: NestJS backend.
- `api/src/auth/`: authentication, JWT, and password reset.
- `api/src/dynamic-mcp/`: dynamic MCP tool generation/execution from APIs.
- `api/src/swagger/`: Swagger/OpenAPI project import and persistence.
- `api/src/prompts/`, `api/src/secrets/`, `api/src/settings/`, `api/src/users/`, `api/src/roles/`: domain modules.
- `api/src/audit-logs/` and `api/src/execution-logs/`: audit trails and execution history.
- `api/src/observability/`: operational health checks, structured logging, Prometheus metrics, correlation IDs, and OpenTelemetry tracing.
- `observability/`: local Prometheus, Grafana, and Tempo helper configuration.
- `docs/ENTITIES.md`: backend domain entity reference across SQLite/TypeORM and MongoDB/Mongoose.
- `docs/DESIGN_PATTERNS.md`: backend and frontend architecture/design pattern reference.
- `docs/FLOWS.md`: user-facing workflow notes and API/UI behavior that affects journeys.

## Commands

- Install frontend dependencies: `npm install`
- Install backend dependencies: `npm install --prefix api`
- Run frontend + backend in development: `npm run dev`
- Run frontend only: `npm run start`
- Run backend only: `npm run start:dev --prefix api`
- Build frontend: `npm run build`
- Type-check frontend: `npm run type-check`
- Test frontend: `npm test`
- Build backend: `npm run build --prefix api`
- Test backend: `npm test --prefix api`
- Test backend with coverage gate: `npm run test:cov --prefix api -- --runInBand`
- Run backend e2e tests: `npm run test:e2e --prefix api`

## Agent Protocol

Before working:

1. Read `AGENTS.md`, `docs/ROADMAP.md`, and `docs/HANDOFF.md`.
2. Run `git status --short`.
3. Review `.claude/agents/README.md` when the task overlaps with a Claude Code specialist area.
4. Review `docs/ENTITIES.md` when the task touches backend domain data or persistence.
5. Review `docs/DESIGN_PATTERNS.md` when the task changes backend architecture, frontend architecture, state management, routing, data access, UI composition, or shared conventions.
6. Identify uncommitted changes and do not revert them unless explicitly asked.
7. If another person's changes affect files you need to edit, read them and work with them.
8. Keep the scope small and aligned with the current task.

While working:

- Prefer existing repository patterns.
- Avoid broad refactors when the task is focused.
- Treat permissions as part of every new feature, not as follow-up work. Any new user-facing surface, route, action, API endpoint, integration, or settings panel must either reuse an existing permission intentionally or add a new permission end-to-end.
- Update tests when changing meaningful behavior.
- Update the relevant documentation in the same change whenever behavior, architecture, entities, flows, commands, infrastructure, agents, or project conventions change.
- Do not change local database files, lockfiles, or deploy configuration unless there is a clear reason.
- If you change frontend code, validate with at least `npm run type-check` or `npm test` when practical.
- If you change backend code, validate with at least `npm test --prefix api` or a focused test when practical.

Permission gate for new features:

1. Decide the permission model before implementing the feature UI/API.
2. Reuse an existing permission only when the feature is genuinely covered by that permission's domain and risk.
3. When adding a permission, update the backend `RolePermissions` contract, backend built-in role presets, frontend `Permission` enum, frontend `UserPermissions`, frontend role fallback presets, affected route/action guards, tests, and documentation.
4. Backend guards/decorators are authoritative for protected API behavior; frontend `can(Permission.X)` checks are required for navigation, disabled states, hidden actions, and permission-specific empty/restricted states.
5. Do not ship a new page, tab, create/edit/delete action, integration, credential surface, or settings panel without explicitly documenting its permission decision.
6. Operational endpoints `/health`, `/ready`, `/live`, and `/metrics` are intentionally public because they are infrastructure probes/scrape targets and do not mutate user data.

After finishing:

1. Update `docs/HANDOFF.md`.
2. Update `docs/ROADMAP.md` if task state changed.
3. Update every affected reference document, or explicitly state that no other documentation was affected.
4. Report which validation commands were run and their result.
5. Make the recommended next step clear.

## Documentation Gate

Every code or configuration change must include a documentation check. Documentation is part of the deliverable, not a follow-up task.

Update these files when the related area changes:

- `AGENTS.md`: project structure, commands, conventions, agent protocol, shared context rules, or available Claude Code specialists.
- `docs/ROADMAP.md`: priorities, task status, decisions, open questions, or completed work.
- `docs/HANDOFF.md`: every completed work session.
- `docs/ENTITIES.md`: backend entities, fields, persistence behavior, repository contracts, or domain data rules.
- `docs/DESIGN_PATTERNS.md`: backend/frontend design patterns, architecture, state management, routing, data access, UI composition, validation, or testing conventions.
- `docs/FLOWS.md`: user-facing flow changes, permission-sensitive UI behavior, onboarding, or error/loading states.
- `src/locales/`: user-facing copy changes, translation namespace additions, or supported locale changes.
- `.claude/agents/README.md`: Claude Code agent additions, removals, renames, or routing changes.
- Specialist files in `.claude/agents/`: agent-specific behavior, scope, tools, or instructions.

Project documentation, source comments, code identifiers, and translation keys must stay in English. Locale values under `src/locales/<locale>/` are the only expected exception and should contain the target-language user-facing translations.

If a change affects user-facing flows, add or update the relevant flow documentation before finishing. If no dedicated flow document exists yet, create one under `docs/` or record the gap in `docs/ROADMAP.md`.

Before finalizing, agents must answer the documentation check internally:

- Did the change alter behavior, data, commands, setup, deployment, UI flow, permissions, or agent workflow?
- Did every new feature, endpoint, page, tab, action, and settings/control surface make an explicit permission decision and update backend/frontend permission definitions if needed?
- If yes, which documentation file was updated?
- If no documentation update was needed, why not?

## Claude Code Agents

Claude Code has specialist agent definitions in `.claude/agents/`. These files are part of the shared development context and should be kept in English.

Index:

- `.claude/agents/README.md`: quick index of available Claude Code specialists.

Known specialists:

- `backend-test-engineer`: backend Jest tests for NestJS services, controllers, guards, repositories, DTO validation, persistence behavior, and API/e2e flows.
- `cloud-expert`: cloud architecture across AWS, GCP, and Azure, including security, cost, managed databases, and Well-Architected practices.
- `compliance-counsel`: software license review, dependency obligations, attribution, distribution risk, contributor policies, and compliance/legal notes.
- `developer-advocate`: developer quickstarts, demos, examples, launch content, DX reviews, and community feedback loops.
- `devops-expert`: CI/CD, GitHub Actions, deploy automation, infrastructure scripts, monitoring, logging, and operational best practices.
- `docker-compose-expert`: Docker Compose environments, networks, volumes, service dependencies, environment variables, and healthchecks.
- `docker-expert`: Dockerfiles, multi-stage builds, minimal images, container security, and production container best practices.
- `gof-expert`: Gang of Four design pattern selection, naming, refactoring, and misuse review.
- `nestjs-expert`: NestJS backend modules, controllers, services, DTOs, guards, interceptors, persistence, authentication, and Jest tests.
- `oss-scout`: open source tool/library discovery, maturity review, comparisons, and project health research.
- `product-owner`: user stories, acceptance criteria, backlog prioritization, MVP scope, requirements, and product documentation.
- `react-frontend-engineer`: React/TypeScript frontend implementation, Feature-Driven Architecture, Atomic Design, barrel exports, hooks, forms, routes, state, API integration, i18n, and frontend tests.
- `render-expert`: Render.com services, `render.yaml`, environment variables, managed databases, health checks, and production deployments.
- `software-architect`: architecture, module boundaries, data modeling, integration strategy, cross-cutting patterns, and technical roadmap decisions.
- `software-engineer`: full-stack implementation, debugging, refactoring, testing, and documentation updates across frontend and backend.
- `solid-expert`: SOLID responsibility boundaries, interface design, dependency direction, substitutability, and maintainability review.
- `system-tutor`: user-facing tutorials, walkthroughs, section guides, onboarding paths, and product explanations for Arthur MCP Adapter.
- `ui-expert`: React, TypeScript, and MUI interface creation, redesign, and review using the project's "openclaw" style with Feature-Driven Architecture, Atomic Design, and controlled barrel exports.
- `ux-analyst`: user journeys, usability audits, onboarding friction, empty/error/loading states, and user-facing flow analysis across pages, features, and shared UI conventions.
- `vercel-expert`: Vercel frontend/API deployment, `vercel.json`, environment variables, preview deployments, domains, and GitHub integration.
- `tool-instructor`: user-facing copy for Arthur MCP Adapter — tooltips, helper text, empty states, error messages, onboarding guides, and in-app documentation.
- `naming-expert`: naming variables, functions, types, components, routes, API endpoints, DB columns, MCP tool/resource/prompt names, and UI labels across the full stack.

When Codex is working on an area covered by one of these specialists, use the specialist description as guidance and preserve any domain-specific constraints documented there. If Claude Code agents are added, renamed, or removed, update both this section and `.claude/agents/README.md`.

## Continuity Conventions

- `AGENTS.md` contains stable project information.
- `docs/ROADMAP.md` contains priorities, tasks, and macro status.
- `docs/HANDOFF.md` contains the latest handoff.
- Documentation must stay in sync with code and configuration changes.
- Small commits with clear messages help any agent resume context.
- When switching between Codex and Claude Code, start the session with: "Read AGENTS.md, docs/ROADMAP.md, docs/HANDOFF.md, and .claude/agents/README.md, run git status --short, and continue from the current state."

# Frontend File Organization Plan

This document defines the completed migration that gave every frontend contract, React module, and utility a clear owner and a single-purpose file. `docs/FRONTEND_EXPORT_AND_FOLDER_CONVENTION_PLAN.md` is the authoritative follow-up for single-export modules, named React implementations, directory barrels, and CSS entry files.

This plan superseded the `types.ts`, `utils.ts`, `constants.ts`, and JSX-free `index.tsx` target examples that were present in older frontend architecture documents.

## Implementation Status

Completed on 2026-07-13.

- All 146 pre-existing named production declarations were extracted; additional component props contracts bring the isolated contract total to 249 files.
- Authentication/permissions is the reference slice, including `permission.enum.ts`, `userPermissions.interface.ts`, and `utils/userPermissionRole.role.ts`.
- Shared and feature utilities are separated by responsibility, duplicate MCP response parsers were consolidated, and hooks use `.hook.ts`.
- All 20 JSX-free `index.tsx` barrels were renamed to `index.ts` during this migration; the follow-up migration subsequently removed every remaining `index.tsx` implementation.
- `npm run check:frontend-structure` enforces the convention and runs automatically through `npm run type-check`.
- Full type-check, 88 frontend tests, and the production build pass without behavior, UI, route, copy, API, or permission changes.

## Goal

- Keep React component files focused on rendering and React-owned coordination.
- Isolate every interface, enum, type alias, class, and entity in a named `name.kind.ts` file.
- Move every top-level non-rendering helper out of component files.
- Give each utility one decision, transformation, validation, parsing, formatting, mapping, building, or factory responsibility.
- Keep domain utilities with their owning feature and reserve `src/utils/` for genuinely cross-feature behavior.
- Make file names reveal what a module contains without opening it.
- Preserve the existing Feature-Driven Architecture, Atomic Design, permission model, and controlled public APIs.

## Scope And Non-Goals

In scope:

- Production frontend code under `src/`.
- React pages, components, contexts, hooks, feature modules, data modules, contracts, constants, and utilities.
- Barrel file extensions and public exports.
- Tests and structural checks needed to protect the new convention.
- Documentation that currently recommends conflicting frontend conventions.

Out of scope:

- Backend organization under `api/`.
- Visual redesign, behavior changes, API contract changes, copy changes, or permission changes.
- Combining semantically different contracts merely because their fields look similar.
- Moving every function to a utility. Stateful React coordination belongs in components or hooks, not in pure utilities.

Permission decision: this refactor introduces no page, route, action, endpoint, integration, credential surface, or settings control. It therefore adds no permission. Existing permission values, role presets, backend alignment, and UI gates must remain byte-for-byte equivalent in behavior.

## Specialist Inputs

The plan consolidates the responsibilities described by the four requested specialist documents:

- `react-specialist`: React component boundaries, render functions, hooks, state ownership, and safe incremental migration.
- `frontend-developer`: TypeScript contracts, file discovery, public APIs, accessibility-safe behavior preservation, and frontend validation.
- `software-engineer`: dependency-aware execution, small commits, tests, rollback points, and workspace safety.
- `software-architect`: ownership boundaries, dependency direction, naming rules, migration order, and enforcement.

## Current Baseline

The read-only audit found:

- 119 `.tsx` files and 39 `.ts` files under `src/`.
- 85 interface, type, enum, or class declarations embedded in 38 production `.tsx` files.
- 41 additional declarations concentrated in generic `types.ts` files.
- 20 JSX-free barrel files were named `index.tsx` even though they only re-exported symbols.
- About 31,600 lines of frontend TypeScript/TSX.
- Large mixed-responsibility hotspots in `NewServer`, `Profile`, `SharePage`, `McpDocs`, `ServerDetail`, and `ToolDialog`.

Representative structural problems:

- `src/context/AuthContext.tsx` contains the `Permission` enum, `UserPermissions`, `Me`, the context contract, role fallback decisions, permission decisions, a hook, and the provider component.
- `src/features/server/types.ts` groups 32 domain records, unions, component props, and UI state contracts.
- Feature-level `types.ts` files combine multiple declarations for AI providers, error tracking, observability, prompts, and secrets.
- Component files contain non-rendering helpers such as metric parsers/formatters, MCP response parsers, schema extraction, slug generation, ID generation, guard-rail factories, and form-state factories.
- MCP response parsing is duplicated in several server modules despite an existing shared implementation.
- Existing utilities such as `sourceType.ts`, `format.ts`, `validation.ts`, `mcpUrl.ts`, `avatar.ts`, `dateRange.ts`, `mcpResponse.ts`, and feature utility files expose multiple responsibilities.
- Data modules such as `api-templates.ts` mix contracts, builders, constants, and datasets.

The audit is a planning baseline, not an exhaustive migration manifest. Phase 0 must generate the final machine-readable inventory from the current branch before files are moved.

## Target Rules

### 1. Component Files

- React components remain in `ComponentName/ComponentName.tsx`; `ComponentName/index.ts` is the public barrel and `ComponentName/index.css` is the stylesheet entry.
- A top-level function declared in a component `.tsx` file must return React UI and act as a component or render component.
- A reusable render helper must become a named component with its own component module.
- Top-level parsing, formatting, validation, mapping, building, decision, factory, or ID-generation functions are forbidden in component files.
- Component props are contracts and must live in their own `.interface.ts` file.
- A component file may import contracts, hooks, constants, and utilities but must not declare them.

Explicit React exception:

- Inline event handlers and callbacks that close over the component's local state may remain inside the component function.
- When stateful coordination becomes large or reusable, move it to a focused `useName.hook.ts` or `useName.hook.tsx` module.
- Do not force stateful callbacks into `utils/`; doing so would leak React state through artificial argument lists.

### 2. Contract And Entity Files

Every named declaration gets its own file. Use lower camel case for the file name and the declaration kind as the suffix.

| Declaration | File pattern | Example |
|---|---|---|
| Interface | `<name>.interface.ts` | `userPermissions.interface.ts` |
| Enum | `<name>.enum.ts` | `permission.enum.ts` |
| Type alias or union | `<name>.type.ts` | `authMode.type.ts` |
| Class | `<name>.class.ts` | `project.class.ts` |
| Frontend entity/model | `<name>.entity.ts` when represented as an entity rather than an interface | `project.entity.ts` |
| Component props | `<componentName>Props.interface.ts` | `baseListCardProps.interface.ts` |

Rules:

- One primary named declaration per file.
- Do not create new catch-all `types.ts`, `models.ts`, or `entities.ts` files.
- Keep the declaration next to its owning context, feature, hook, component, or data domain.
- Do not create a global type dump.
- Preserve runtime imports for enums; do not convert enum imports to `import type`.
- Use `import type` and `export type` for type-only dependencies and public exports.
- Similar names such as `JsonSchema`, `HealthEntry`, `HeaderEntry`, or settings response contracts must be reviewed semantically before consolidation.

### 3. Utility Files

A utility is a stateless decision or transformation that does not render JSX and does not own React state, effects, or lifecycle.

Rules:

- One public utility responsibility per file.
- Name the file after the action and its role, not after a vague category.
- Put domain-specific utilities in `src/features/<feature>/utils/` or the relevant feature sub-area's `utils/` folder.
- Put a utility in `src/utils/` only when it is genuinely cross-feature and domain-neutral.
- Keep non-trivial utilities directly testable with a colocated or nearby focused test.
- Do not create or retain catch-all `utils.ts`, `format.ts`, `validation.ts`, `helpers.ts`, or `misc.ts` files.

Preferred suffixes communicate intent:

| Responsibility | Example |
|---|---|
| Role or policy decision | `userPermissionRole.role.ts` |
| Permission decision | `canUserPermission.permission.ts` |
| Parser | `parseMcpResponse.parser.ts` |
| Formatter | `formatBytes.formatter.ts` |
| Validator | `isValidUrl.validator.ts` |
| Mapper | `toolToFormState.mapper.ts` |
| Builder | `buildCurlCommand.builder.ts` |
| Factory | `createInputConstraint.factory.ts` |
| Serializer | `serializeEnvironmentValues.serializer.ts` |
| General pure utility without a stronger domain role | `<functionName>.util.ts` |

The specific `userPermissionRole.role.ts` convention is the reference for role-based decisions: role preset data stays in separate constant files, while the function that chooses a preset lives in `utils/` and has focused tests.

### 4. Hooks, API Modules, Constants, And Data

- Custom hooks use `useName.hook.ts` when they do not contain JSX and `useName.hook.tsx` only when JSX is unavoidable.
- React contexts/providers remain React modules; their interfaces, hooks, decisions, and constants are extracted.
- API calls and side-effecting adapters belong in feature `api/` modules, services, or hooks, not in `utils/`.
- One coherent constant or tightly bound constant map uses `<name>.constant.ts`.
- Large static datasets may remain a single data file, but their interfaces, builders, and transformations must be extracted.
- Tests keep `.test.ts` or `.test.tsx` according to whether the test itself contains JSX.

### 5. Barrel Files

- Every barrel is `index.ts`; `index.tsx` is forbidden.
- React rendering belongs in a matching named `.tsx` implementation, never in `index.ts`.
- Named modules export one symbol; aggregation and re-exports belong only in `index.ts`.
- Barrels contain no interfaces, enums, constants, decisions, utilities, or side effects.
- Preserve controlled named exports and explicit `export type`; do not introduce broad `export *` exports.
- Use direct imports inside the same feature when a barrel would create a cycle.
- Expose only stable public feature APIs. Internal utilities and contracts remain internal unless a real external consumer exists.

## Reference Slice: Authentication And Permissions

Authentication and permissions will be the first implementation slice because it contains every category covered by the new convention and has clear behavior to preserve.

Illustrative target shape:

```text
src/context/auth/
  AuthProvider.tsx
  useAuth.hook.ts
  permission.enum.ts
  userPermissions.interface.ts
  me.interface.ts
  authContextValue.interface.ts
  constants/
    allPermissionsOff.constant.ts
    rolePermissionFallbacks.constant.ts
    readOnlyFallback.constant.ts
  utils/
    userPermissionRole.role.ts
    canUserPermission.permission.ts
    index.ts
    index.css
  index.ts
  index.css
  index.ts
```

The exact folder transition may adapt to current import boundaries, but the file responsibilities and names are mandatory. The slice must preserve:

- Every `Permission` runtime value.
- Every `UserPermissions` key.
- Admin bypass behavior.
- Built-in role fallbacks.
- Unknown-role read-only fallback.
- Backend-provided permission precedence.
- Existing `useAuth`, provider, logout, reload, and loading behavior.

## Migration Plan

### Phase 0: Baseline, Convention Freeze, And Inventory

Objective: establish a reliable starting point and a complete migration checklist before source edits.

Tasks:

1. Repair or recreate the invalid Git worktree metadata before implementation. The current repository metadata points to a removed `/home/alexandre/Documents/projects/mcp-convert/mcp/.git/worktrees/...` path, so `git status --short` cannot run reliably. Do not repair this automatically during a refactor slice.
2. Capture baseline results for `npm run type-check`, `npm test`, and `npm run build` after Git state is trustworthy.
3. Generate an inventory of:
   - declarations inside `.tsx`;
   - generic type/utility/constant files;
   - top-level non-rendering functions in React modules;
   - duplicate helpers and all consumers;
   - JSX-free `index.ts` barrels;
   - import cycles and high-fan-out contracts.
4. Turn the inventory into a per-file migration checklist grouped by owner and dependency.
5. Align `docs/DESIGN_PATTERNS.md`, `docs/FRONTEND_ARCHITECTURE_PLAN.md`, and `docs/FRONTEND_MODULARIZATION_PLAN.md` with this convention before the first source migration is considered complete.

Exit criteria:

- Baseline failures are distinguished from migration regressions.
- Every target file has an owner, category, destination, and consumer list.
- The convention has no unresolved naming or exception questions.

### Phase 1: Authentication And Permissions Reference Slice

Objective: prove the convention on a cross-cutting, testable area.

Tasks:

1. Extract `Permission`, `UserPermissions`, `Me`, and the auth context contract.
2. Split permission preset constants by responsibility.
3. Move role fallback selection to `utils/userPermissionRole.role.ts`.
4. Move the permission decision to its own focused permission utility.
5. Separate `useAuth` from the provider component.
6. Preserve a controlled `index.ts` public API so consumers do not depend on internal paths.
7. Add table-driven tests for admin, backend permissions, built-in roles, unknown roles, and anonymous users.

Exit criteria:

- The provider `.tsx` contains only React rendering and React-owned coordination.
- Permission behavior is unchanged and covered by focused tests.
- No consumer imports an internal auth file accidentally.

### Phase 2: Shared Foundations And Existing Utilities

Objective: remove mixed responsibilities from the global layer before feature migrations depend on it.

Priority targets:

1. MCP response parsing and result formatting.
2. Source type contracts, source decisions, and source display mapping.
3. Date range contracts and transformations.
4. URL validation, email validation, and port validation.
5. MCP URL normalization, OAuth URL construction, and absolute URL construction.
6. Avatar letter and color derivation.
7. JSON formatting and tested-at formatting.
8. Hook configuration/return interfaces currently declared in hook files.
9. Color mode and contextual navigation contracts currently declared in React files.

Migration rule: add the focused module and test, migrate every consumer in the slice, validate, and remove the old declaration before the slice is complete. Transitional re-exports may exist while a local slice is in progress but must not become a new permanent catch-all file.

### Phase 3: Leaf Features

Objective: migrate lower-risk domains before the highly connected server model.

Recommended order:

1. `prompts`
2. `secrets`
3. `aiProviders`
4. `errorTracking`
5. `observability`
6. shared Atomic Design components and their props

For each feature:

1. Split every declaration from `types.ts` and component files.
2. Split constants and decision/transformation functions by responsibility.
3. Extract props interfaces from components.
4. Move top-level non-rendering functions to the feature's `utils/`.
5. Rename JSX-free barrels to `index.ts` and preserve the public API.
6. Run focused tests, full type-check, and build before marking the feature complete.

### Phase 4: Server Contracts And Utilities

Objective: dismantle `src/features/server/types.ts` in dependency order without introducing cycles.

Recommended contract order:

1. Leaf schema and mapping contracts such as JSON schema and parameter mapping.
2. Endpoint references and authentication contracts.
3. Tool, resource, prompt, chain, and log contracts.
4. Project and health contracts.
5. Form-state records and component props.
6. UI-only status and discriminated union types.

Recommended utility order:

1. Consolidate duplicated MCP response parsing.
2. Split curl builders from schema inference.
3. Split form factories from form-state mapping.
4. Extract Handlebars schema analysis from `DynamicResourceDialog`.
5. Extract guard-rail and harness factories.
6. Extract resource response type decisions and other pure helpers.

Apply this phase by server sub-area (`api-endpoints`, `resources`, `prompts`, `guardRails`, `harness`, `chains`, `connect`, `settings`, `activity`) rather than as one repository-wide move.

### Phase 5: Pages And Large React Modules

Objective: remove page-local contracts and top-level helpers after shared and feature contracts are stable.

Recommended order:

1. `McpDocs` and `SharePage` contracts, parsing, and formatting.
2. Observability pages and panels.
3. `Profile` roles, users, permissions, and dialog props.
4. Prompt and secret detail/create pages.
5. Settings, templates, dashboard, audit, and upload pages.
6. `ServerDetail` orchestration leftovers.
7. `NewServer` last because it is the largest and most connected page.

For each page:

- Move domain contracts to their feature, not to a page-wide type dump.
- Move page-only contracts to individually named files beside the page.
- Convert top-level JSX helpers into feature/page components.
- Move reusable stateful coordination to focused hooks.
- Move pure decisions and transformations to the owning `utils/` folder.
- Do not mix structural changes with visual, i18n, API, route, or permission changes.

### Phase 6: Barrels, Cleanup, And Enforcement

Objective: remove transitional structure and prevent regression.

Tasks:

1. Rename every JSX-free `index.ts` barrel to `index.ts`.
2. Remove obsolete `types.ts`, mixed utilities, compatibility re-exports, and duplicate helpers.
3. Add an AST-based frontend structure check using the existing TypeScript toolchain. It should report:
   - interface, enum, type alias, class, or entity declarations in production `.tsx` files;
   - JSX-free barrels named `index.ts`;
   - forbidden generic catch-all file names;
   - top-level non-rendering helpers in component modules;
   - utility modules with multiple public responsibilities.
4. Add the structure check to the normal frontend validation/CI path.
5. Document narrowly justified exclusions such as `vite-env.d.ts`, test fixtures, or generated declarations.
6. Run the complete validation matrix and update roadmap/handoff state.

## Validation Strategy

For every small migration slice:

1. Add or move the contract/utility and its focused tests.
2. Migrate all consumers in that slice.
3. Run `npm run type-check`.
4. Run the closest Vitest files for the affected context, hook, feature, page, or utility.
5. Run `npm run build` after file renames or public API changes to catch case-sensitive paths and resolution issues.
6. Remove the old declaration/module only after consumers pass.

At the end of every feature or phase:

- `npm run type-check`
- `npm test`
- `npm run build`
- the new frontend structure check once Phase 6 introduces it

Focused test priorities:

- Role and permission fallback decisions.
- MCP JSON-RPC and SSE response parsing, including malformed input.
- Source tag classification with missing or unknown tags.
- Slug, schema, form mapping, and nested-data transformations.
- Utility boundary cases for dates, URLs, numbers, booleans, objects, and arrays.
- Existing component/page behavior where imports or mocks move.

## Commit And Rollback Strategy

- Use one coherent commit per contract/utility or small tightly coupled cluster.
- Do not move the entire frontend in one commit.
- Within a slice: add the destination and tests, migrate consumers, validate, then remove the source.
- Keep formatting-only churn out of structural commits.
- Create a validated checkpoint at the end of each feature.
- If a slice regresses behavior, revert that slice's commit; do not use destructive reset commands.
- Suggested commit scopes include `frontend-auth`, `frontend-contracts`, `mcp-utils`, `server-types`, and the owning feature name.

## Risks And Mitigations

- Runtime enum breakage: preserve value imports for enums and verify emitted behavior.
- Circular dependencies through barrels: use direct internal imports and explicit type-only public exports.
- Case-sensitive deployment failures: run the production build after every rename batch.
- Vitest mock/path breakage: migrate tests and mocks in the same slice as their consumer.
- Accidental semantic consolidation: confirm ownership and meaning before merging similarly shaped contracts.
- Utility dumping ground: default to feature-local `utils/` and require demonstrated cross-feature use before promotion.
- File-count explosion: group by feature/sub-area and preserve controlled public barrels for discovery.
- Over-extraction of stateful callbacks: use hooks for React coordination and keep small closure-based callbacks inside components.
- Permission regressions: treat auth as a reference slice with table-driven behavior tests before broad migration.
- Merge conflicts in large pages: migrate leaf dependencies first and keep each page slice small.

## Definition Of Done

The migration is complete when:

- No production `.tsx` file declares an interface, enum, type alias, class, or frontend entity.
- Every named contract/entity has its own `name.kind.ts` file.
- No component file contains a top-level non-rendering helper.
- Component props live in separate `.interface.ts` files.
- Every public utility module has one clear responsibility and one primary public function.
- No generic `types.ts`, `utils.ts`, `constants.ts`, `helpers.ts`, `format.ts`, or `validation.ts` catch-all remains in the migrated frontend.
- Known duplicated parsing, slug, schema, formatting, and role decision logic is consolidated under the correct owner.
- Hooks, API modules, constants, and utilities are not confused with one another.
- Only `index.ts` aggregates exports; React entry points use matching named `.tsx` files.
- Every directory under `src/` contains `index.ts` and `index.css`.
- Feature public APIs remain explicit and no new circular dependency is introduced.
- Permission behavior, routes, UI, API contracts, and user-facing copy are unchanged.
- Type-check, full frontend tests, production build, and the structural check pass.
- `docs/DESIGN_PATTERNS.md`, frontend architecture/modularization plans, `docs/ROADMAP.md`, and `docs/HANDOFF.md` reflect the completed state.

## Recommended First Implementation Step

The migration and its corrective export/folder follow-up are complete. Future work should preserve the enforced convention through `npm run check:frontend-structure` and avoid compatibility facades that re-export from named files.

# Frontend Modularization Plan

This document turns the current frontend modularization direction into an execution plan. It is intentionally incremental and should be applied without broad rewrites.

Current file convention: `docs/FRONTEND_EXPORT_AND_FOLDER_CONVENTION_PLAN.md` is implemented and authoritative. Generic `types.ts`, `constants.ts`, `utils.ts`, and `*-utils.ts` modules are forbidden. Use individual `name.kind.ts` contracts, one-purpose utilities, `.hook.ts` hooks, focused `.constant.ts` files, matching named React `.tsx` implementations, and pure `index.ts` barrels. Every named module exports one symbol and every source directory contains `index.ts` plus `index.css`.

## Goal

Move the frontend toward a domain-oriented modular structure where route pages orchestrate data loading and navigation, and domain features own their UI sections, local state, API adapters, and helpers.

The immediate target is to reduce the coupling and size of `src/pages/ServerDetail.tsx` and then reuse the same structure in other frontend domains.

## Current Constraints

- The project already uses route pages under `src/pages/`.
- The `src/features/server/` area already exists and should be treated as the reference implementation path.
- The current `ServerDetail` flow must preserve the Operations compatibility phase and current i18n behavior.
- Existing shared contexts should remain limited to cross-route concerns such as auth, terminology, theme, and server navigation.
- Refactors should remain behavior-preserving unless a task explicitly includes product changes.

## Target Frontend Shape

Use these ownership rules consistently.

### `src/pages/`

Responsibilities:

- Route orchestration.
- Initial page loading.
- Permission gating at the page level when needed.
- Cross-section state that truly belongs to the route.
- Composition of feature modules.

Non-responsibilities:

- Large dialog bodies.
- Form mapping helpers.
- Reusable tab bodies.
- Source-specific request builders.
- Domain-specific transformation logic.

### `src/features/<domain>/`

Responsibilities:

- Cohesive UI for one domain or one route sub-area.
- Domain-local state hooks.
- API request wrappers or feature-local service adapters.
- Types used by more than one module inside the same feature.
- Form-state mappers, schema helpers, and transformation utilities.

Default internal layout:

```text
src/features/<domain>/
  api/
  components/
  hooks/
  utils/
  types/
  index.ts
```

Large domains may keep capability subfolders instead:

```text
src/features/server/
  activity/
  api-endpoints/
  chains/
  connect/
  prompts/
  resources/
  settings/
  api/
  hooks/
  types/
  constants/
  utils/
```

### `src/components/`

Keep only components that are truly cross-feature.

Good candidates:

- confirmation dialogs;
- preview widgets;
- shared save indicators;
- generic autocomplete wrappers.

Do not move feature-specific dialogs or editors here just to reduce import depth.

### `src/context/`

Keep only application-wide state here.

Allowed examples:

- auth;
- terminology;
- theme;
- cross-route navigation state.

Avoid creating context for page-local or tab-local state.

## Phase Plan

## Phase 1: Stabilize the `server` feature boundary

Goal: turn `ServerDetail` into a route orchestrator instead of a multi-thousand-line implementation surface.

Tasks:

1. Keep `src/pages/ServerDetail.tsx` responsible only for:
   - route params;
   - top-level project fetch and refresh;
   - tab selection;
   - high-level permission checks;
   - composing tab panels and dialogs.
2. Move remaining large tab bodies and dialog implementations under `src/features/server/`.
3. Move request payload shaping and response-to-form mapping into feature-local helpers.
4. Keep reusable server feature contracts in individual files under `src/features/server/types/`, exposed through `src/features/server/types/index.ts` only when they cross sub-areas.
5. Create feature-local hooks for server detail state where state is shared by multiple server submodules.

Acceptance criteria:

- `ServerDetail.tsx` no longer contains large domain helper blocks.
- Most server tab sections render imported modules rather than inline JSX blocks.
- API-specific mapping logic lives outside the page.
- `npm run type-check` passes after each extraction slice.

Rollback point:

- Any extraction that expands behavior scope beyond structure should be split into a separate change.

## Phase 2: Standardize internal feature anatomy

Goal: prevent each new feature module from inventing a different structure.

Tasks:

1. Add a consistent internal shape for `src/features/server/`:
   - capability folders for UI modules;
   - optional `api/` folder for server feature requests;
   - optional `hooks/` folder for shared server detail state.
2. Normalize naming:
   - `*Tab.tsx` for tab bodies;
   - `*Panel.tsx` for bounded sections inside a tab;
   - `*Dialog.tsx` for modal workflows;
   - `utils/<action>.<role>.ts` for pure helpers, with one responsibility per file.
3. Add narrow barrel exports only when they reduce import noise without hiding ownership.

Acceptance criteria:

- New modules follow consistent names and folder ownership.
- Imports reveal the owning feature clearly.
- Pure helpers are separated from rendering code.

## Phase 3: Create feature-local API boundaries

Goal: reduce direct `api.get` or `api.patch` calls inside large route components.

Tasks:

1. For `server`, introduce feature-local request modules for related operations.
2. Keep response normalization close to the feature instead of repeating it in pages.
3. Use page components as callers of feature functions instead of mixing request code through UI files.

Acceptance criteria:

- The main route pages contain less inline HTTP logic.
- Request and mapping logic becomes searchable by feature.
- Feature modules can be tested more easily in isolation.

## Phase 4: Apply the same model to the next domains

Recommended order:

1. `server`
2. `prompts`
3. `secrets`
4. `settings`
5. `auth`
6. `templates`

Selection criteria:

- page size;
- frequency of change;
- business criticality;
- number of dialogs/forms embedded directly in the page.

Initial targets:

- `src/pages/Prompts.tsx`
- `src/pages/Secrets.tsx`
- `src/pages/Settings.tsx`

Acceptance criteria:

- Each domain page becomes primarily orchestration.
- Feature-specific dialogs and editors move into `src/features/<domain>/`.
- Shared pieces are promoted to `src/components/` only when used across features.

## Phase 5: Tighten shared boundaries

Goal: avoid creating a generic dumping ground.

Rules:

- Put something in `src/components/` only if at least two features use it or it is clearly application-wide.
- Put something in `src/utils/` only if it is not domain-owned.
- Prefer `src/features/<domain>/utils/` over global utilities for domain logic.
- Prefer page-local state or feature hooks over new context providers.

## Implementation Sequence

Use this sequence for actual delivery work.

1. Finish slimming `src/pages/ServerDetail.tsx`.
2. Add `src/features/server/hooks/` only if cross-section server state is still duplicated.
3. Group server requests into feature-local API helpers.
4. Refactor `Prompts` into `src/features/prompts/`.
5. Refactor `Secrets` into `src/features/secrets/`.
6. Refactor `Settings` into `src/features/settings/`.
7. Review remaining pages for the same pattern.

## Quality Gates

For each modularization slice:

1. Limit each change to one route or one feature area.
2. Preserve behavior unless the task explicitly includes UX changes.
3. Run `npm run type-check` after each meaningful extraction.
4. Add focused tests when behavior or data mapping changes.
5. Update `docs/HANDOFF.md` and `docs/ROADMAP.md` when the task state changes.

## Risks

- Mixing architecture work with product changes will make regressions harder to isolate.
- Overusing context will recreate the original coupling in a different form.
- Moving code to `components/` too early will blur ownership.
- Creating a broad `shared/` or `utils/` layer too early will produce a dumping ground.
- Merging old worktree snapshots wholesale can regress current Operations or i18n behavior.

## Definition of Success

The modularization effort is successful when:

- route pages are visibly smaller and mostly orchestration;
- each major domain has an obvious feature home;
- feature-local API and mapping logic are easy to locate;
- new frontend work can be added without reopening giant page files;
- the team can work in parallel on separate frontend domains with low merge friction.

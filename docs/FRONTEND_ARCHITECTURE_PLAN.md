# Frontend Architecture Plan

This plan defines how to align the frontend with Feature-Driven Architecture, Atomic Design, and controlled barrel exports. It is intentionally incremental: preserve behavior first, then improve structure in small validated steps.

## Goals

- Keep route pages thin and focused on routing, top-level loading, page-level state, and feature composition.
- Move domain-specific UI, hooks, types, constants, API helpers, and utilities into `src/features/<feature>/`.
- Promote only truly reusable, domain-neutral UI into shared Atomic Design component groups.
- Add `index.tsx` barrels as explicit public APIs at feature and shared component boundaries.
- Reduce deep imports, cross-feature coupling, and page-owned implementation details.
- Keep every migration step type-safe and behavior-preserving.

## Specialist Inputs

- `react-frontend-engineer`: owns practical React/TypeScript implementation, route orchestration, feature folders, hooks, API integration, i18n, and validation.
- `software-architect`: owns boundaries, dependency direction, public APIs, migration sequencing, and documentation of frontend conventions.
- `software-engineer`: owns incremental execution, testability, low-risk refactors, and keeping the existing workspace stable.

## Current Baseline

Existing feature modules already provide a good starting point:

- `src/features/server/`
- `src/features/prompts/`
- `src/features/secrets/`
- `src/features/settings/`

The current `src/features/` tree has no barrel files yet. Shared components still live flat in `src/components/`, and several large route pages remain implementation-heavy:

- `src/pages/NewServer.tsx`
- `src/pages/Profile.tsx`
- `src/pages/McpDocs.tsx`
- `src/pages/PromptDetail.tsx`
- `src/pages/ServerDetail.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/Layout.tsx`
- `src/pages/SecretDetail.tsx`
- `src/pages/Templates.tsx`
- `src/pages/Settings.tsx`

## Target Structure

Use this as the long-term shape, not as a mandatory folder scaffold for every feature:

```text
src/
  pages/
    ServerDetail/
      index.tsx
    NewServer/
      index.tsx
  features/
    server/
      api-endpoints/
      chains/
      connect/
      resources/
      prompts/
      settings/
      components/
      hooks/
      api/
      types.ts
      constants.ts
      index.tsx
    prompts/
      components/
      hooks/
      types.ts
      index.tsx
    secrets/
      components/
      hooks/
      types.ts
      index.tsx
  components/
    atoms/
    molecules/
    organisms/
    templates/
    index.tsx
  hooks/
  utils/
```

Only create folders when there is enough code to justify them.

## Architectural Rules

### Feature-Driven Architecture

- A feature is a product capability or domain surface, not just a technical category.
- Feature-owned code belongs under `src/features/<feature>/`.
- Route pages live in `src/pages/PageName/index.tsx`, with focused page tests colocated in the same folder when present.
- Pages may import feature public APIs, but should not import deep internals when a feature barrel exists.
- Features should not import another feature's internals. If reuse is needed, expose a stable public API through the owning feature.
- Shared folders are for cross-cutting, domain-neutral code only.
- During migration, avoid changing behavior, copy, permissions, routing, or API contracts unless the task explicitly requires it.

### Atomic Design

- Use feature-local components first.
- Promote UI to `src/components/` only when it is reused across features or is genuinely domain-neutral.
- Put each React component in its own folder with an `index.tsx` entry point, for example `src/components/atoms/HelpButton/index.tsx`.
- Use atoms for primitives such as chips, badges, labels, icon actions, status indicators, and field pieces.
- Use molecules for composed controls such as search bars, filters, tag inputs, action groups, and compact form groups.
- Use organisms for reusable sections such as panels, drawers, accordions, tables, list cards, and settings groups.
- Use templates for reusable page, dialog, or drawer shells that do not own domain behavior.
- Do not create atomic folders for one-off components.

### Barrel Exports

- Use `index.tsx` as a controlled public API for React component and feature folders, not as a dumping ground.
- Prefer named exports and `export type` over broad `export *`.
- Barrel files belong at feature boundaries and shared component group boundaries.
- Avoid importing from a barrel inside the same folder that defines the exported files.
- Watch for circular dependencies after adding barrels.
- Keep internal-only helpers unexported unless another module has a real need.

## Migration Phases

### Phase 0: Inventory And Import Map

Objective: identify current coupling before moving files.

Tasks:

- List all page imports from `src/components/`, `src/hooks/`, `src/utils/`, and `src/features/`.
- Identify components that are used by one feature only and should move into that feature.
- Identify shared components that are reused across features and should become Atomic Design candidates.
- Identify deep imports into `src/features/server/*` that should later go through barrels.
- Record any route page with more than one responsibility: orchestration, API calls, form logic, domain formatting, dialogs, and repeated UI.

Acceptance criteria:

- A short migration inventory exists in this plan or a follow-up checklist.
- No source files are moved in this phase.
- Risky areas and candidate owners are named before implementation starts.

Validation:

- Documentation-only change; `git diff --check` is enough.

### Phase 1: Establish Feature Barrels

Status: completed for the first existing feature set.

Objective: create stable public APIs for existing feature modules without changing behavior.

Suggested first barrels:

- `src/features/server/index.tsx`
- `src/features/server/api-endpoints/index.tsx`
- `src/features/server/settings/index.tsx`
- `src/features/server/connect/index.tsx`
- `src/features/server/resources/index.tsx`
- `src/features/server/prompts/index.tsx`
- `src/features/server/chains/index.tsx`
- `src/features/prompts/index.tsx`
- `src/features/secrets/index.tsx`
- `src/features/settings/index.tsx`

Completed first-slice barrels:

- `src/features/server/index.tsx`
- `src/features/server/activity/index.tsx`
- `src/features/server/api-endpoints/index.tsx`
- `src/features/server/chains/index.tsx`
- `src/features/server/connect/index.tsx`
- `src/features/server/prompts/index.tsx`
- `src/features/server/resources/index.tsx`
- `src/features/server/settings/index.tsx`
- `src/features/prompts/index.tsx`
- `src/features/secrets/index.tsx`
- `src/features/settings/index.tsx`
- `src/components/index.tsx`
- `src/components/atoms/index.tsx`
- `src/components/organisms/index.tsx`
- `src/components/templates/index.tsx`

Tasks:

- Add explicit named exports for public components.
- Add explicit `export type` entries for public types.
- Keep feature-internal utilities private unless currently imported outside the feature.
- Update page imports to use barrels only where it improves clarity.
- Avoid changing intra-folder imports to barrel imports.

Acceptance criteria:

- No `export *` barrels are introduced unless there is a documented reason.
- Pages consume feature modules through public APIs where stable.
- Type checking passes.

Validation:

- `npm run type-check`

### Phase 2: Thin The Largest Route Pages

Status: page files have been moved into `PageName/index.tsx` folders; route thinning is still pending.

Objective: convert implementation-heavy pages into route orchestrators.

Priority order:

1. `src/pages/NewServer.tsx`
2. `src/pages/Profile.tsx`
3. `src/pages/McpDocs.tsx`
4. `src/pages/PromptDetail.tsx`
5. `src/pages/SecretDetail.tsx`
6. `src/pages/Dashboard.tsx`
7. `src/pages/Templates.tsx`
8. `src/pages/Settings.tsx`

Tasks:

- Extract feature-owned sections into `src/features/<feature>/`.
- Extract page-specific hooks only when they clarify orchestration.
- Keep API calls in pages only if the page is the true owner; otherwise move them into feature-local hooks or API helpers.
- Keep user-facing strings in existing i18n namespaces.
- Update imports to use feature barrels after each extraction.

Acceptance criteria:

- Each touched page primarily composes feature modules and owns route-level state.
- Extracted components have focused props and no hidden global dependencies.
- Behavior, routing, permissions, and i18n keys remain stable.

Validation:

- `npm run type-check`
- Focused frontend tests when the touched page has tests or when behavior changes.

### Phase 3: Promote Shared UI Into Atomic Design

Objective: turn proven shared UI into a clearer shared component system.

Initial candidates:

- `BaseListCard` as an organism.
- `BaseDialogLayout` as a template.
- `ConfirmDialog` as an organism or template depending on final API.
- `SaveIndicator`, status chips, labels, and compact indicators as atom candidates.
- Search/filter/action rows discovered during page thinning as molecule candidates.

Tasks:

- Create atomic folders only for categories with multiple shared components or clear near-term growth.
- Move domain-neutral shared components into `src/components/atoms`, `src/components/molecules`, `src/components/organisms`, or `src/components/templates`.
- Leave domain-aware components in their features.
- Add `src/components/index.tsx` and group-level barrels only when they reduce import noise.
- Update imports incrementally.

Acceptance criteria:

- Shared components are domain-neutral or intentionally generic.
- Atomic categories are practical and not ceremonial.
- Feature-local components are not prematurely promoted.
- Type checking passes.

Validation:

- `npm run type-check`
- Manual visual check for components with layout-sensitive changes when practical.

### Phase 4: Move Feature-Owned Shared Hooks And Utilities

Objective: reduce global shared folders to truly cross-cutting logic.

Tasks:

- Review `src/hooks/` and `src/utils/` usage.
- Keep hooks global only when used across unrelated features.
- Move feature-owned hooks or utilities into the owning feature.
- Expose shared hooks through barrels only when needed.
- Keep pure utilities small and directly tested where behavior is meaningful.

Acceptance criteria:

- `src/hooks/` contains only cross-feature hooks.
- `src/utils/` contains only cross-feature pure utilities.
- Feature-specific helpers live with their feature.

Validation:

- `npm run type-check`
- Focused tests for moved pure utilities when available.

### Phase 5: Enforce Boundaries

Objective: prevent drift after the migration.

Tasks:

- Add a lightweight import-boundary review checklist to `docs/DESIGN_PATTERNS.md` or this plan.
- Optionally add lint rules later if the project adopts an import-boundary tool.
- Add review guidance for new frontend PRs:
  - Is this page still orchestration-only?
  - Does this code belong to a feature?
  - Is this component truly shared?
  - Should this public import go through a barrel?
  - Is the barrel explicit and cycle-safe?

Acceptance criteria:

- New frontend work has a clear decision path for page, feature, shared component, hook, and utility placement.
- Barrels remain intentional public APIs.

Validation:

- Documentation review.
- `npm run type-check` for any source changes.

## Feature Ownership Map

Use this map when deciding where new or moved code belongs:

| Feature | Owns |
|---|---|
| `server` | server detail, MCP connection, endpoints, operations, tools, resources, server prompts, chains, settings, activity, source-specific UI |
| `prompts` | global prompt list, prompt cards, prompt detail modules, prompt template interactions when they become domain behavior |
| `secrets` | secret list, secret detail modules, secret reveal/reference UI, secret metadata presentation |
| `settings` | global settings panels, terminology, headers, SMTP and future global configuration UI |
| `dashboard` | dashboard cards, summaries, quick links, recent activity presentation |
| `auth` | login, setup, forgot/reset password flows if they grow beyond route pages |
| `templates` | API templates and prompt templates if list/detail behavior becomes complex |
| `docs` | MCP documentation and connection instructions if `McpDocs` is split |

Create a new feature only when code represents a stable product capability and is likely to grow independently.

## Implementation Checklist Per Slice

For each migration slice:

- Read the page, related feature modules, imports, locale files, and tests.
- Identify the owner: page, feature, shared Atomic Design component, shared hook, or utility.
- Move one cohesive unit at a time.
- Add or update a barrel only at the boundary being used.
- Replace imports in the smallest set of files.
- Run `npm run type-check`.
- Run focused tests if behavior changed.
- Update docs and handoff.

## Risks And Mitigations

- Risk: barrel files introduce circular dependencies.
  Mitigation: avoid intra-folder barrel imports and keep barrels explicit.
- Risk: Atomic Design becomes folder ceremony.
  Mitigation: create atomic folders only for reused shared UI.
- Risk: feature extraction accidentally changes behavior.
  Mitigation: one slice per change, type-check each slice, and avoid copy/routing/API changes during structural moves.
- Risk: shared components become too generic.
  Mitigation: keep domain-aware UI in features and require concrete reuse before promotion.
- Risk: pages still own too much logic after moving JSX.
  Mitigation: move feature-owned hooks, formatters, constants, and types with the extracted UI when they have the same reason to change.

## Recommended First Execution Slice

Phase 1 is complete for the existing `server`, `prompts`, `secrets`, and `settings` feature modules.

Continue with `NewServer.tsx` because it is currently the largest route page and likely has the highest return from feature extraction.

# Frontend Export And Folder Convention Plan

## Status

Completed on 2026-07-13.

Implementation results:

- All 185 directories under `src/` contain `index.ts` and `index.css`.
- All 87 existing `index.tsx` implementations moved to matching named `.tsx` files.
- No named production module exports more than one symbol.
- `AuthContext.tsx`, `ServerNavContext.tsx`, and `ColorModeContext.tsx` were replaced by single-export provider implementations and directory barrels.
- Large API and prompt template datasets remain directly imported by consumers where necessary to preserve separate lazy chunks.
- `npm run check:frontend-structure` enforces directory coverage, the single-export rule, pure barrels, and the absence of `index.tsx`.

This is the corrective follow-up to `docs/FRONTEND_FILE_ORGANIZATION_PLAN.md`. It preserves the one-responsibility file rules already implemented and adds three stricter requirements:

1. A named source file has exactly one export.
2. Only `index.ts` may aggregate or expose multiple exports.
3. Every directory under `src/`, including non-visual directories, contains both `index.ts` and `index.css`.

The migration is structural only. It must not change rendering, routes, API calls, authentication behavior, permissions, translations, or styling.

## Motivation

Before this migration, `src/context/AuthContext.tsx` demonstrated the problem. It exported `AuthProvider` and also re-exported `Permission`, `useAuth`, `can`, `AuthContextValue`, `Me`, and `UserPermissions`. The provider implementation was focused, but the named file was also acting as a barrel.

The desired separation is:

- Named files implement or declare one public symbol.
- `index.ts` defines the public API of a directory.
- `index.css` is the style entry point of a directory, even when it is intentionally empty.

## Scope And Permission Decision

In scope:

- All directories and TypeScript/TSX modules below `src/`.
- Component, page, context, hook, utility, constant, data, type, theme, locale, and root source directories.
- Import paths, public API barrels, CSS entry files, structural checks, tests, and architecture documentation.

Out of scope:

- Backend modules below `api/`.
- Visual redesign or migration away from MUI `sx` styling.
- API, data, route, copy, authentication, authorization, or permission changes.
- Moving domain ownership merely to make imports shorter.

Permission decision: this refactor creates no new user-facing surface or action and therefore requires no permission changes. Existing permission values, role fallbacks, guards, and UI checks must behave identically.

## Current Baseline

The read-only audit on 2026-07-13 found:

- 185 directories under `src/`, including `src` itself.
- 142 directories without `index.ts`.
- 184 directories without `index.css`; only the root `src/index.css` currently exists.
- 87 directories with an implementation in `index.tsx` but no `index.ts`.
- 9 named production modules with more than one export.
- `AuthContext.tsx` had 7 exports when direct exports and re-exports were counted.

The other named multi-export modules are:

- `src/context/ServerNavContext.tsx`
- `src/theme/ColorModeContext.tsx`
- `src/hooks/useAsyncFeedback.hook.ts`
- `src/hooks/useCopyToClipboard.hook.ts`
- `src/hooks/useDetailPageNav.hook.ts`
- `src/hooks/useListPageLogic.hook.ts`
- `src/data/api-templates.ts`
- `src/data/prompt-templates.ts`

Phase 0 must regenerate this inventory because directory and export counts may change before implementation begins.

## Target Rules

### 1. Named Files Have One Export

A named `.ts` or `.tsx` file must expose exactly one symbol.

Examples:

- `AuthProvider.tsx` exports only `AuthProvider`.
- `permission.enum.ts` exports only `Permission`.
- `useAuth.hook.ts` exports only `useAuth`.
- `userPermissions.interface.ts` exports only `UserPermissions`.
- `methodColor.constant.ts` exports only `METHOD_COLOR`.

Rules:

- Re-exports are forbidden in named files.
- `export *` is forbidden outside `index.ts` and should remain avoided inside `index.ts` unless explicitly justified.
- Prefer named exports; default exports are not introduced by this migration.
- A named file may contain private supporting declarations when they are inseparable from its exported responsibility, but it still has exactly one exported symbol.
- Tests, setup files, and Vite declaration files must be inventoried separately. Any necessary tooling exception must be explicit in the structural checker rather than implicit.

### 2. `index.ts` Is The Only Aggregator

Every directory has an `index.ts` that represents its public boundary.

Rules:

- `index.ts` may export one or many symbols.
- `index.ts` contains no business logic, React implementation, contracts, constants, or data definitions.
- Prefer explicit exports such as `export { AuthProvider } from './AuthProvider'` and `export type { Me } from './me.interface'`.
- Internal files within a directory import siblings directly to reduce circular dependency risk.
- External consumers import through the nearest stable owning directory boundary.
- Parent barrels expose only stable child APIs and must not automatically export every internal file.
- There will be no `index.tsx` after the migration.
- A directory with no public TypeScript surface still receives `index.ts`; it uses `export {}` until a deliberate public API exists.

### 3. Every Directory Has `index.css`

Every directory below `src/`, including types, utils, constants, hooks, locales, and data directories, receives `index.css`.

Rules:

- `index.css` may be empty when the directory has no CSS responsibility.
- This migration does not move existing MUI `sx` styles into CSS.
- Component and page implementations import their local `index.css` when it contains styles.
- Non-visual directories do not import an empty stylesheet merely to create a runtime side effect.
- New global selectors are forbidden. Future non-empty files use locally scoped, component-prefixed class names until a CSS Modules decision is made.
- CSS entry files are not recursively imported by parent barrels; style loading remains owned by the rendering module that needs it.

### 4. Component And Page Folder Shape

The implementation must no longer live in `index.tsx`.

Target component shape:

```text
ComponentName/
  ComponentName.tsx
  componentNameProps.interface.ts
  index.ts
  index.css
```

Target page shape:

```text
PageName/
  PageName.tsx
  PageName.test.tsx
  index.ts
  index.css
```

`ComponentName.tsx` or `PageName.tsx` exports only its matching React component. The folder `index.ts` re-exports it and any other intentionally public contracts.

### 5. Non-Visual Folder Shape

Target utility folder shape:

```text
utils/
  parseValue.util.ts
  formatValue.util.ts
  index.ts
  index.css
```

Each utility file exports one function. `index.ts` is the only multi-export module. `index.css` is present but empty.

The same rule applies to `types/`, `constants/`, `hooks/`, `data/`, `locales/`, `context/`, `theme/`, and every other source directory.

## Authentication Reference Slice

Authentication is the first migration slice because it exposes the incorrect compatibility facade and is imported broadly.

Target shape:

```text
src/context/auth/
  AuthProvider.tsx
  authContext.context.ts
  authContextValue.interface.ts
  me.interface.ts
  permission.enum.ts
  useAuth.hook.ts
  userPermissions.interface.ts
  constants/
    ...
    index.ts
    index.css
  utils/
    ...
    index.ts
    index.css
  index.ts
  index.css
```

Migration steps:

1. Move the provider implementation from `src/context/AuthContext.tsx` to `src/context/auth/AuthProvider.tsx`.
2. Ensure `AuthProvider.tsx` exports only `AuthProvider`.
3. Make `src/context/auth/index.ts` the sole public aggregator for `AuthProvider`, `Permission`, `useAuth`, `can`, and public auth contracts.
4. Rewrite imports from `context/AuthContext` to the `context/auth` public boundary.
5. Remove `AuthContext.tsx`; do not retain another named compatibility facade with re-exports.
6. Run focused auth/context tests before continuing to other folders.

## Migration Phases

### Phase 0: Inventory And Guard Preparation

- Regenerate the directory inventory and named-file export inventory from the current branch.
- Classify tooling files and document any required exceptions.
- Record import fan-out for the 9 current multi-export modules and 87 `index.tsx` implementations.
- Extend the structural checker in report-only form before moving files.
- Capture the frontend type-check, test, and build baseline.

Exit criteria: a reproducible manifest lists every missing `index.ts`, missing `index.css`, `index.tsx`, named multi-export file, and affected import.

### Phase 1: Authentication Reference Slice

- Apply the authentication target shape above.
- Remove the `AuthContext.tsx` compatibility facade.
- Update all auth imports through `src/context/auth/index.ts`.
- Add the required `index.ts` and `index.css` files in the touched directories.
- Validate auth behavior and permission fallback behavior without changing them.

Exit criteria: no import references `AuthContext.tsx`, every named auth module has one export, and auth tests pass.

### Phase 2: Remaining Named Multi-Export Modules

- Split the Server Navigation and Color Mode provider facades into single-export implementations plus folder barrels.
- Remove type re-exports from hook implementation files; expose the hook and its public contracts through the owning `index.ts`.
- Split data constants, datasets, builders, and contracts so each named data file exports one symbol.
- Update consumers incrementally and check for circular imports after each boundary.

Exit criteria: no named production `.ts` or `.tsx` module exports more than one symbol.

### Phase 3: Components And Pages

- Rename each of the 87 `index.tsx` implementations to its matching `ComponentName.tsx` or `PageName.tsx`.
- Create a pure `index.ts` barrel in every migrated directory.
- Create `index.css` in every migrated directory.
- Keep tests beside pages/components and update mocks that target `index.tsx` paths.
- Preserve lazy-loading behavior and route chunk boundaries.

Exit criteria: no `index.tsx` exists and all component/page imports resolve through `index.ts`.

### Phase 4: Complete Directory Coverage

- Add missing `index.ts` to all remaining feature, utility, type, constant, hook, data, locale, theme, context, and root directories.
- Add missing `index.css` to every directory under `src/`.
- Use `export {}` in directories that intentionally expose no TypeScript API.
- Review parent barrels so internal modules do not become public accidentally.

Exit criteria: all directories beneath `src/`, including `src`, contain both required files.

### Phase 5: Imports And Public Boundaries

- Prefer folder imports at feature, component, page, context, hook, and shared utility boundaries.
- Keep direct sibling imports inside an owning folder where they prevent cycles.
- Replace imports that reach into another feature's internal files with that feature's `index.ts` API.
- Detect and resolve circular dependencies rather than masking them with import-order changes.
- Verify that Vite lazy imports still resolve to the intended folder entry point.

Exit criteria: import rules are consistent, public APIs are explicit, and no new circular dependency is known.

### Phase 6: Permanent Enforcement And Documentation

- Make the structural checker fail when a named file has zero or more than one export.
- Allow multiple exports only in `index.ts`.
- Fail when any directory below `src/` lacks `index.ts` or `index.css`.
- Fail when any `index.tsx` exists.
- Fail when `index.ts` contains executable implementation instead of exports/imports.
- Update `AGENTS.md`, `docs/DESIGN_PATTERNS.md`, frontend specialist guidance, and older architecture plans after implementation.
- Keep the checker integrated with `npm run type-check`.

Exit criteria: the repository and automated gate agree on every target rule.

## Validation Strategy

Run after each migration phase:

- `npm run check:frontend-structure`
- `npm run type-check`
- Focused tests for the migrated area

Run before completion:

- `npm test`
- `npm run build`
- A search proving no `index.tsx` remains
- A directory audit proving every directory has `index.ts` and `index.css`
- An AST audit proving every named source file has exactly one export
- A circular dependency audit for public barrels

Manual smoke checks should cover login/logout, permission-gated navigation, color mode, contextual server navigation, lazy-loaded routes, and one representative component from each feature family.

## Risks And Mitigations

- Barrel cycles: keep sibling imports direct and migrate one ownership boundary at a time.
- Bundle changes: compare production chunks before and after component/page entry-point migration.
- Lost type-only semantics: use explicit `export type` in barrels and preserve `import type` at consumers.
- Accidental public API expansion: parent barrels export only reviewed stable symbols.
- CSS collisions: leave generated CSS empty and require prefixed selectors for future styles.
- CSS side effects in non-visual modules: do not import empty CSS from type, utility, data, or locale barrels.
- Large noisy migration: use phase-specific commits and do not mix behavior or visual changes.
- Compatibility facades returning: enforce the one-export rule automatically; do not keep deprecated named re-export files.

## Rollback Strategy

- Keep each phase in a separate commit.
- Complete and validate the auth reference slice before broad migration.
- Migrate component/page folders by feature family so a failed slice can be reverted without reverting completed independent slices.
- Do not delete the previous entry file until its imports compile through the new `index.ts` boundary within the same phase.
- Treat any behavior, route, auth, permission, styling, or bundle regression as a stop condition.

## Definition Of Done

- Every directory under `src/` contains `index.ts` and `index.css`.
- No `index.tsx` file remains.
- Every named production `.ts` and `.tsx` file has exactly one export.
- Only `index.ts` files aggregate multiple exports.
- `AuthContext.tsx` no longer exists; auth is exposed through `src/context/auth/index.ts`.
- Component and page implementations use matching named `.tsx` files.
- Empty CSS placeholders introduce no runtime imports or visual changes.
- Structural checks, type-check, all frontend tests, and production build pass.
- Login, logout, permission gates, theme switching, navigation contexts, and lazy routes preserve current behavior.
- Architecture and agent documentation describe the implemented convention consistently.

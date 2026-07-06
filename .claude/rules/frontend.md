---
description: React/Vite frontend conventions — Feature-Driven Architecture, Atomic Design, i18n, permissions, testing
paths:
  - "src/**"
---

# Frontend Rules

Full pattern catalog: `docs/DESIGN_PATTERNS.md` (Frontend Patterns section).

## Architecture

- Route pages (`src/pages/PageName/index.tsx`) stay thin: routing, route params, top-level data loading, page-level state, composition.
- Domain implementation belongs under `src/features/<feature>/` (components, hooks, api, types, constants, utils). Do not import another feature's internal files — reuse only through the owning feature's barrel export.
- Shared, domain-neutral UI can follow Atomic Design (`atoms/`, `molecules/`, `organisms/`, `templates/`) under `src/components/` — only introduce these folders when shared UI volume justifies it.
- Use `index.tsx` barrels at feature/component boundaries for stable public APIs; prefer named exports over `export *`; avoid barrels in one-file folders.
- Preserve behavior during modularization/extraction — do not mix refactors with product changes.

## API, i18n, theming

- All HTTP calls go through the shared `src/api.ts` Axios instance (bearer token + 401 handling already wired). Never create page-local Axios instances.
- User-facing copy goes through `useTranslation(namespace)` / `src/locales/<locale>/`; translation keys, identifiers, comments, and docs stay in English — only locale values are translated.
- Configurable domain terms (server, tool, resource, prompt, chain, secret) go through `useTerm()`, not hardcoded labels.
- Global theme/palette/typography changes belong in `src/theme/`; avoid hardcoded colors outside existing theme tokens.

## Permissions (non-negotiable)

- Gate every UI action with `can(Permission.X)` from `AuthContext`. Frontend checks are never the only security layer — backend guards remain authoritative.
- New route/sidebar item/tab/primary/destructive/credential/execution action needs a permission decision before the feature is done (see `.claude/rules/permissions.md`).
- Use restricted empty states or disabled controls when the user can view but not act; hide navigation only when the user cannot view the surface at all.

## Testing

- Vitest + React Testing Library, prefer user-facing queries.
- Validate with `npm run type-check` and `npm test` (or a focused test file) before considering a change done.

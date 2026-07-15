---
description: Permission-gate workflow for any new user-facing surface or protected action
paths:
  - "api/src/roles/**"
  - "api/src/**/*.controller.ts"
  - "api/src/**/*.guard.ts"
  - "src/context/**"
  - "src/pages/**"
  - "src/features/**"
---

# Permission Gate

Treat permissions as part of every feature's design, not follow-up work. Any new page, tab, API endpoint, integration, credential surface, settings panel, or create/edit/delete/test/share action must either **reuse an existing permission intentionally** or **introduce a new permission end-to-end**.

## Decide first

1. Does an existing permission already cover this domain and risk level? If yes, reuse it — do not add a near-duplicate.
2. If not, name the new permission `<domain>_<verb>` (e.g. `secrets_reveal`, `servers_test`), matching the risk of the action, not just its domain.

## Update every surface in the same change

- Backend: `RolePermissions` contract, built-in role presets (`api/src/roles/permissions.ts`), guards/decorators (`RequirePermission`) on the affected controller(s).
- Frontend: `Permission` enum, `UserPermissions`, role fallback presets (`src/context/permissionPresets.ts`), `can(Permission.X)` gates on the affected nav item/route/action.
- Tests covering the new guard/decorator behavior and the UI gate.
- Documentation: record the permission decision (`docs/DESIGN_PATTERNS.md` change checklist, `docs/FLOWS.md` if the journey changes).

## Rules

- Do not add frontend-only permissions without backend support — if backend support must be deferred, record the gap in `docs/ROADMAP.md` and keep the UI inaccessible until the backend permission exists.
- Do not add backend-only protected behavior without updating the frontend permission model and restricted/disabled UI states.
- Backend guards are authoritative; frontend checks are for navigation, disabled states, and empty/restricted states only.
- `/health`, `/ready`, `/live`, `/metrics` are intentionally public — they are infrastructure probes, not user-facing surfaces.

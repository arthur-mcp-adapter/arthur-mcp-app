---
name: add-permission
description: Add or reuse a permission end-to-end (backend + frontend) for a new page, tab, endpoint, or protected action in Arthur MCP. Use whenever a feature introduces a new user-facing surface or protected action that needs a permission decision.
argument-hint: <domain>_<verb> e.g. secrets_reveal
---

Wire a permission end-to-end for the feature being implemented. Full rules: `.claude/rules/permissions.md` and `docs/DESIGN_PATTERNS.md` (Guard and Decorator Authorization / Auth and Permission Context sections).

1. **Decide**: check whether an existing permission already covers this domain and risk. If yes, reuse it and stop here — do not add a near-duplicate. If not, name the new permission `<domain>_<verb>` matching the action's risk (not just its domain).
2. **Backend**, in the same change:
   - Add the key to the `RolePermissions` contract.
   - Add it to built-in role presets in `api/src/roles/permissions.ts`.
   - Guard the controller route with `RequirePermission` (or the relevant guard).
3. **Frontend**, in the same change:
   - Add the key to the `Permission` enum and `UserPermissions`.
   - Add it to role fallback presets in `src/context/permissionPresets.ts`.
   - Gate the nav item / route / button with `can(Permission.X)`.
   - Add a restricted empty state or disabled control for view-but-not-act cases; hide navigation only when the user cannot view the surface at all.
4. **Tests**: cover the new guard/decorator behavior and the UI gate.
5. **Docs**: record the decision per `docs/DESIGN_PATTERNS.md`'s change checklist; update `docs/FLOWS.md` if the user journey changes.

Do not ship a frontend-only permission without backend enforcement, and do not ship backend-only protected behavior without a frontend permission model + restricted UI state. If backend support must be deferred, record the gap in `docs/ROADMAP.md` and keep the UI inaccessible until the backend permission exists.

---
name: sync-upstream
description: Sync this fork's main branch with the upstream Arthur MCP repository (alexmmatos/arthur-mcp via the `upstream` remote). Use when upstream has new commits to pull in, or the user asks to "sync with upstream" / "update the fork".
---

Merge `upstream/main` into `main`, preserving fork-specific customizations (Supabase-only auth, branding, deploy config). Follow the same merge pattern as prior syncs (`git log --oneline --merges`) — merge, not rebase, since `origin/main` is shared.

1. **Check state**: `git status --short` must be clean (stash or ask the user if not). `git fetch upstream`, then `git log --oneline main..upstream/main` to see what's incoming.
2. **Backup**: create `backup/pre-upstream-sync-<YYYYMMDD>` from current `main` before merging, so a bad merge can be reset to instead of fought through.
3. **Merge**: `git merge upstream/main`.
4. **Resolve conflicts**, favoring the fork's side where the two genuinely diverge:
   - `docs/HANDOFF.md` / `docs/ROADMAP.md`: keep both sides' entries — append, don't drop either.
   - Auth, branding, deploy config (`vite.config.mts`, `render.yaml`, `docker-compose*.yml`, locale files): keep the fork's version unless upstream's change is an unrelated fix worth taking too.
   - Everything else: take upstream's version unless it clobbers a fork-specific feature.
5. **Validate**: `npm run type-check`, `npm test`, `npm test --prefix api`, `npm run test:e2e --prefix api`. Fix regressions before continuing.
6. **Docs**: run the documentation gate (see `.claude/skills/session-handoff`) — record the sync (upstream commits pulled in, conflicts resolved and how) in `docs/HANDOFF.md`.
7. **Push**: push `main` to `origin` (never to `upstream`) — confirm with the user first.

If the merge goes badly wrong, `git merge --abort`, or reset `main` to the backup branch rather than fighting through it.

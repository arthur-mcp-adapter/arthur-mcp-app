---
name: session-handoff
description: Close out a work session on Arthur MCP by updating docs/HANDOFF.md and docs/ROADMAP.md and reporting which validation commands were run. Use at the end of a task, before telling the user work is complete.
---

Run the project's documentation gate (`AGENTS.md` → "After finishing") before reporting a task done:

1. Append a new entry to `docs/HANDOFF.md` describing what changed and why, in the file's existing format.
2. Update `docs/ROADMAP.md` if task/priority state changed (mark items done, add new ones discovered during the work).
3. Check every file `AGENTS.md`'s Documentation Gate lists (`docs/ENTITIES.md`, `docs/DESIGN_PATTERNS.md`, `docs/FLOWS.md`, `src/locales/`, `.claude/agents/`) and update any that the change actually touched — or state explicitly that none applied and why.
4. Report which validation commands were run (`npm run type-check`, `npm test`, `npm test --prefix api`, `npm run test:e2e --prefix api`, etc.) and their result.
5. State the recommended next step.

Skip file updates that genuinely don't apply, but the check itself is mandatory — do not silently skip the documentation gate.

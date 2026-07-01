#!/bin/bash
# Registers new source files in docs/last-audit.md after a Write tool call.
# Receives Claude Code hook JSON on stdin.

PROJECT_ROOT="/home/alexandre/Documents/projects/mcp-convert/mcp"
AUDIT_FILE="$PROJECT_ROOT/docs/last-audit.md"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
[ "$TOOL_NAME" != "Write" ] && exit 0

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Normalise to relative path
REL_PATH="${FILE_PATH#$PROJECT_ROOT/}"

# Only track files inside src/ or api/src/
[[ "$REL_PATH" != src/* ]] && [[ "$REL_PATH" != api/src/* ]] && exit 0

# Skip spec / test files
[[ "$REL_PATH" == *.spec.ts  ]] && exit 0
[[ "$REL_PATH" == *.spec.tsx ]] && exit 0
[[ "$REL_PATH" == *.test.ts  ]] && exit 0
[[ "$REL_PATH" == *.test.tsx ]] && exit 0

# Skip non-source extensions
[[ "$REL_PATH" == */locales/* ]] && exit 0
[[ "$REL_PATH" == *.hbs  ]] && exit 0
[[ "$REL_PATH" == *.json ]] && exit 0
[[ "$REL_PATH" == *.css  ]] && exit 0
[[ "$REL_PATH" == *.d.ts ]] && exit 0

# Only .ts / .tsx
[[ "$REL_PATH" != *.ts ]] && [[ "$REL_PATH" != *.tsx ]] && exit 0

# Skip if already registered
grep -qF "\`$REL_PATH\`" "$AUDIT_FILE" && exit 0

SECTION_HEADER="## New Files — Pending Classification"

if ! grep -qF "$SECTION_HEADER" "$AUDIT_FILE"; then
  printf '\n---\n\n%s\n\n> Files added after the initial audit. Classify and move to the appropriate section after review.\n\n| File | Role | Last Arch Audit | Last SOLID Audit |\n|------|------|:-:|:-:|\n' \
    "$SECTION_HEADER" >> "$AUDIT_FILE"
fi

printf '| `%s` | — | — | — |\n' "$REL_PATH" >> "$AUDIT_FILE"

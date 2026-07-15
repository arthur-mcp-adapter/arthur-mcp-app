#!/bin/bash
# Reads the Claude Code statusLine JSON payload on stdin and prints one status line.
INPUT=$(cat)

MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "unknown"')
DIR=$(echo "$INPUT" | jq -r '.workspace.current_dir // "."')
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')

BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
DIRNAME=$(basename "$DIR")

printf '%s | %s%s | $%.4f session' "$MODEL" "$DIRNAME" "${BRANCH:+ ($BRANCH)}" "$COST"

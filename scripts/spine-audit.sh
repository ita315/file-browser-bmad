#!/usr/bin/env bash
set -euo pipefail

TARGET="${TARGET:-src/lib}"
MODEL="${MODEL:-sonnet}"

PROMPT="בדוק את ${TARGET} מול הכללים ב-CLAUDE.md וב-.claude/rules/. דווח על הפרות עם קובץ ושורה. אל תציע לשנות קבצים."

claude -p "$PROMPT" \
  --tools "Read,Grep,Glob" \
  --max-turns 15 \
  --max-budget-usd 1 \
  --output-format json \
  --model "$MODEL" \
| jq -r '"is_error: \(.is_error)", "num_turns: \(.num_turns)", "total_cost_usd: \(.total_cost_usd)", "result:", .result'

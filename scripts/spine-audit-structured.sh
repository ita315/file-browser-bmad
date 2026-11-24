#!/usr/bin/env bash
set -euo pipefail

TARGET="${TARGET:-src/lib}"
MODEL="${MODEL:-sonnet}"
MAX_TURNS="${MAX_TURNS:-15}"
SCHEMA="$(cat "$(dirname "$0")/audit-findings.schema.json")"

PROMPT="בדוק את ${TARGET} מול הכללים ב-CLAUDE.md וב-.claude/rules/. לכל הפרה החזר קובץ, שורה ותיאור הבעיה. אם אין הפרות, החזר רשימה ריקה. אל תשנה קבצים."

OUT="$(claude -p "$PROMPT" \
  --tools "Read,Grep,Glob" \
  --disallowedTools "mcp__*" \
  --max-turns "$MAX_TURNS" \
  --max-budget-usd 1 \
  --output-format json \
  --model "$MODEL" \
  --json-schema "$SCHEMA")" || true

SUBTYPE="$(jq -r '.subtype' <<<"$OUT")"
echo "turns: $(jq -r '.num_turns' <<<"$OUT") · cost: \$$(jq -r '.total_cost_usd' <<<"$OUT")" >&2

# 🟥 נקטע: לא נבדק, ולכן גם לא "נקי"
if [ "$SUBTYPE" != "success" ] || [ "$(jq '.structured_output == null' <<<"$OUT")" = "true" ]; then
  echo "CUT SHORT: $SUBTYPE — not checked, not clean" >&2
  exit 2
fi

COUNT="$(jq '.structured_output.findings | length' <<<"$OUT")"

# 🟩 נקי
if [ "$COUNT" -eq 0 ]; then
  echo "CLEAN"
  exit 0
fi

# 🟧 יש הפרות: קובץ:שורה — בעיה
jq -r '.structured_output.findings[] | "\(.file):\(.line) — \(.problem)"' <<<"$OUT"
exit 1
#!/usr/bin/env bash
input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  echo "?"
  exit 0
fi

model=$(jq -r '.model.display_name // empty' <<<"$input" 2>/dev/null)
cost=$(jq -r '.cost.total_cost_usd // 0 | numbers' <<<"$input" 2>/dev/null)

if [ -z "$model" ] || [ -z "$cost" ]; then
  echo "?"
  exit 0
fi

LC_ALL=C printf '%s · $%.2f\n' "$model" "$cost"

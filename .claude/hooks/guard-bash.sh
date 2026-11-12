#!/usr/bin/env bash
# PreToolUse hook for the Bash tool.
# Blocks: rm with -r and -f together, npm publish, git push --force / -f.
# Fail closed: any parsing problem blocks the command (exit 2).

block() {
  echo "guard-bash: blocked. $1" >&2
  exit 2
}

command -v jq >/dev/null 2>&1 || block "jq is not installed, so the command cannot be checked."

input=$(cat)

# -e makes jq fail on null/false, so a missing command also fails closed.
cmd=$(printf '%s' "$input" | jq -er '.tool_input.command | strings') \
  || block "could not read tool_input.command from the hook input (invalid JSON or jq failed)."

# Split chained commands (; & | parentheses, newlines) so each is checked separately.
segments=$(printf '%s' "$cmd" | tr ';&|()' '\n\n\n\n\n')

while IFS= read -r line; do
  read -ra t <<< "$line"
  n=${#t[@]}
  for ((i = 0; i < n; i++)); do
    word=${t[i]##*/}
    case "$word" in
      rm)
        r=0 f=0
        for ((j = i + 1; j < n; j++)); do
          tok=${t[j]}
          case "$tok" in
            --recursive) r=1 ;;
            --force) f=1 ;;
            --*) ;;
            -*)
              [[ $tok == *[rR]* ]] && r=1
              [[ $tok == *f* ]] && f=1
              ;;
          esac
        done
        ((r && f)) && block "rm with -r and -f together can delete a whole tree without asking. Remove files explicitly or without -f."
        ;;
      npm)
        for ((j = i + 1; j < n; j++)); do
          [[ ${t[j]} == publish ]] && block "npm publish releases a package publicly. Run it yourself, not through Claude."
        done
        ;;
      git)
        push=0 force=0
        for ((j = i + 1; j < n; j++)); do
          tok=${t[j]}
          [[ $tok == push ]] && push=1
          [[ $tok == --force || $tok == -f ]] && force=1
        done
        ((push && force)) && block "git push --force / -f can overwrite remote history. Use a normal push."
        ;;
    esac
  done
done <<< "$segments"

exit 0

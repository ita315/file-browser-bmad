#!/usr/bin/env bash
# PreToolUse hook for the Bash tool.
# Blocks: rm with -r and -f together, npm publish, git push --force / -f,
# any mention of .env / .env.* (except .env.example), writes to .claude/settings.json or dist/.
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

# .env files: block any mention (read or write) except .env.example.
# \.env must start a path component and end at a non-name character, so .envrc and foo.env pass.
env_re='(^|[^A-Za-z0-9_])(\.env(\.[A-Za-z0-9_-]+)*)($|[^A-Za-z0-9_-])'
rest=$cmd
while [[ $rest =~ $env_re ]]; do
  [[ ${BASH_REMATCH[2]} == .env.example ]] || block "${BASH_REMATCH[2]} may hold secrets. Only .env.example can be touched through Bash."
  rest=${rest#*"${BASH_REMATCH[2]}"}
done

# Protected write targets: .claude/settings.json and anything under dist/.
is_protected() {
  local p=${1//[\"\']/}
  case "$p" in
    .claude/settings.json | */.claude/settings.json | dist | dist/* | */dist | */dist/*) return 0 ;;
  esac
  return 1
}

# Redirects (>, >>, &>, >|) to a protected target. 2>&1 and > /dev/null do not match.
redir_re='>[|]?[[:space:]]*([\"'\'']?[^[:space:];&|<>]+)'
rest=$cmd
while [[ $rest =~ $redir_re ]]; do
  is_protected "${BASH_REMATCH[1]}" && block "redirecting into ${BASH_REMATCH[1]} is not allowed. Edit it yourself, not through Claude."
  rest=${rest#*"${BASH_REMATCH[0]}"}
done

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
      tee)
        for ((j = i + 1; j < n; j++)); do
          is_protected "${t[j]}" && block "tee into ${t[j]} is not allowed."
        done
        ;;
      cp | mv)
        # The destination is the last argument.
        ((n - 1 > i)) && is_protected "${t[n - 1]}" && block "$word into ${t[n - 1]} is not allowed."
        ;;
      sed)
        inplace=0
        for ((j = i + 1; j < n; j++)); do
          [[ ${t[j]} == -i* || ${t[j]} == --in-place* ]] && inplace=1
        done
        if ((inplace)); then
          for ((j = i + 1; j < n; j++)); do
            is_protected "${t[j]}" && block "sed -i on ${t[j]} is not allowed."
          done
        fi
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

#!/usr/bin/env bash
# Mechanical evidence for the rules-audit skill. Requirements: README.md next to this file.
#
#   audit.sh                    short evidence per rule: match count and first lines.
#                               It never decides pass or fail
#   audit.sh --section TEXT     every line of the sections whose title contains TEXT,
#                               without running `npm run check`
#   audit.sh --validate         check a report table from stdin
#
# Read-only commands only: no redirect to a file, no temp files. The one documented
# exception is `npm run check`, which may write caches and whose tests may create and
# delete a temp dir; the worktree is compared before and after it.

set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo 'audit.sh: not inside a git repository' >&2
  exit 2
}
cd "$root" || exit 2

spine=$(ls _bmad-output/planning-artifacts/architecture/*/ARCHITECTURE-SPINE.md 2>/dev/null | head -n 1)
design=$(ls _bmad-output/planning-artifacts/ux-designs/*/DESIGN.md 2>/dev/null | head -n 1)
specs_dir=_bmad-output/implementation-artifacts

if [ -z "$spine" ]; then
  echo 'audit.sh: ARCHITECTURE-SPINE.md not found' >&2
  exit 2
fi

# ---------------------------------------------------------------- helpers

rule_list() {
  grep -oE '^### AD-[0-9]+' "$spine" | sed 's/^### //'
  for f in .claude/rules/*.md; do
    [ -e "$f" ] && basename "$f" .md
  done
}

SHORT_LINES=5
SHORT_WIDTH=160
only=''
matched=0

# section TITLE BODY [all]. `all`: never shortened (the rule list, the check result, WORKTREE).
section() {
  local title=$1 body=${2:-} mode=${3:-} total=0 first shown

  if [ -n "$only" ]; then
    case $title in
      *"$only"*) ;;
      *) return ;;
    esac
    matched=$((matched + 1))
    printf '\n== %s ==\n%s\n' "$title" "${body:-(no matches)}"
    return
  fi

  if [ "$mode" = 'all' ]; then
    printf '\n== %s ==\n%s\n' "$title" "$body"
    return
  fi

  [ -z "$body" ] || total=$(printf '%s\n' "$body" | grep -c '')
  printf '\n== %s [%s] ==\n' "$title" "$total"
  [ "$total" -eq 0 ] && return
  first=$(printf '%s\n' "$body" | head -n "$SHORT_LINES")
  shown=$(printf '%s\n' "$first" | cut -c1-"$SHORT_WIDTH")
  printf '%s\n' "$shown"
  if [ "$total" -gt "$SHORT_LINES" ]; then
    echo "... +$((total - SHORT_LINES)) more: --section '$title'"
  elif [ "$shown" != "$first" ]; then
    echo "... lines cut at $SHORT_WIDTH characters: --section '$title'"
  fi
}

# Rejected rows only inside the Review Triage Log; the same words elsewhere are not rejections.
triage_rejections() {
  awk '/^## / { in_log = ($0 ~ /^## Review Triage Log/); next }
       in_log && /\| *(reject|false) *\||נדחה *\|/ { print FNR ":" $0 }' "$1"
}

code() { grep -rnE --include='*.ts' --include='*.tsx' "$@"; }
prod() { code "$@" | grep -v '\.test\.'; }

# ---------------------------------------------------------------- --validate

# Drops the bidi marks that project docs put before backticks, then markdown and padding.
clean_cell() {
  printf '%s' "$1" \
    | sed -e $'s/\xe2\x80\x8f//g' -e $'s/\xe2\x80\x8e//g' \
    | tr -d '`*' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

line_count() { # [sha] path
  if [ -n "$1" ]; then
    git show "$1:$2" 2>/dev/null | grep -c ''
  elif [ -f "$2" ]; then
    grep -c '' "$2"
  else
    echo 0
  fi
}

validate() {
  local rules seen='' errors=0 line row c1 c2 c3 c4 token sha rest path num total rule count

  rules=$(rule_list)

  while IFS= read -r line; do
    case $line in
      *'|'*) ;;
      *) continue ;;
    esac
    row=${line#*|}
    c1=${row%%|*}; row=${row#*|}
    c2=${row%%|*}; row=${row#*|}
    c3=${row%%|*}; row=${row#*|}
    c4=${row%%|*}
    c1=$(clean_cell "$c1"); c2=$(clean_cell "$c2"); c3=$(clean_cell "$c3"); c4=$(clean_cell "$c4")

    case $c1 in
      'הכלל' | '' | -*) continue ;;
    esac

    if ! printf '%s\n' "$rules" | grep -Fxq -- "$c1"; then
      echo "ERROR unknown rule: $c1"
      errors=$((errors + 1))
      continue
    fi
    seen="$seen$c1"$'\n'

    case $c2 in
      'עובר') ;;
      'נכשל')
        tokens=$(printf '%s\n' "$c3" | grep -oE '([0-9a-f]{7,40}:)?[A-Za-z0-9_./-]+\.[A-Za-z0-9]+:[0-9]+')
        if [ -z "$tokens" ]; then
          echo "ERROR $c1: failed without file:line"
          errors=$((errors + 1))
        fi
        for token in $tokens; do
          num=${token##*:}
          rest=${token%:*}
          sha=''
          if printf '%s' "$rest" | grep -qE '^[0-9a-f]{7,40}:'; then
            sha=${rest%%:*}
            rest=${rest#*:}
          fi
          path=$rest
          case $path in
            /* | ../* | */../*)
              echo "ERROR $c1: path outside the project: $token"
              errors=$((errors + 1))
              continue
              ;;
          esac
          total=$(line_count "$sha" "$path")
          if [ "$total" -eq 0 ]; then
            echo "ERROR $c1: file not found: $token"
            errors=$((errors + 1))
          elif [ "$num" -lt 1 ] || [ "$num" -gt "$total" ]; then
            echo "ERROR $c1: line out of range (file has $total): $token"
            errors=$((errors + 1))
          fi
        done
        ;;
      'לא ניתן לאימות')
        if [ -z "$c4" ]; then
          echo "ERROR $c1: not verifiable without a reason"
          errors=$((errors + 1))
        fi
        ;;
      *)
        echo "ERROR $c1: invalid result: '$c2'"
        errors=$((errors + 1))
        ;;
    esac
  done

  for rule in $rules; do
    count=$(printf '%s' "$seen" | grep -Fxc -- "$rule")
    if [ "$count" -ne 1 ]; then
      echo "ERROR $rule: appears $count times, expected once"
      errors=$((errors + 1))
    fi
  done

  if [ "$errors" -eq 0 ]; then
    echo 'VALID'
    return 0
  fi
  echo "INVALID ($errors errors)"
  return 1
}

if [ "${1:-}" = '--validate' ]; then
  validate
  exit $?
fi

if [ "${1:-}" = '--section' ]; then
  only=${2:-}
  if [ -z "$only" ]; then
    echo 'audit.sh: --section needs text from a section title' >&2
    exit 2
  fi
fi

# ---------------------------------------------------------------- preflight

preflight() {
  for tool in node npm git grep sed awk tr cksum wc; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "audit.sh: missing tool: $tool (see README.md)" >&2
      exit 2
    fi
  done

  node_version=$(node -p 'process.versions.node')
  node_major=${node_version%%.*}
  node_rest=${node_version#*.}
  node_minor=${node_rest%%.*}
  if [ "$node_major" -lt 24 ] || { [ "$node_major" -eq 24 ] && [ "$node_minor" -lt 15 ]; }; then
    echo "audit.sh: Node >=24.15 required, found $node_version (see README.md)" >&2
    exit 2
  fi

  for bin in tsc oxlint stylelint vitest; do
    if [ ! -x "node_modules/.bin/$bin" ]; then
      echo "audit.sh: node_modules/.bin/$bin missing; run npm ci (see README.md)" >&2
      exit 2
    fi
  done
}

[ -n "$only" ] || preflight

# ---------------------------------------------------------------- run

snapshot() {
  git --no-optional-locks status --short
  git --no-optional-locks diff | cksum
}

[ -n "$only" ] || before=$(snapshot)

section 'rules' "$(rule_list)" all
section 'context' "HEAD $(git rev-parse --short HEAD), branch $(git rev-parse --abbrev-ref HEAD), node ${node_version:-not checked}
spine $spine
design ${design:-not found}" all

if [ -z "$only" ]; then
  check_output=$(npm_config_update_notifier=false npm run check 2>&1)
  check_rc=$?
  # Long enough for a failure summary; on red, the rerun of `npm run check` shows the rest.
  section "npm run check: exit $check_rc" "$(printf '%s\n' "$check_output" | tail -n 8)" all
fi

# AD-1 --------------------------------------------------------------------
import_re="^[[:space:]]*(import|export) .*from ['\"]|^[[:space:]]*import ['\"]|import\\("
local_re="from ['\"]\\./|import ['\"]\\./"
for layer in lib adapters ui test; do
  section "AD-1: imports leaving src/$layer" "$(code "$import_re" "src/$layer" | grep -vE "$local_re")"
done
section 'AD-1: src/lib touching the browser' \
  "$(prod '\b(window|document|globalThis|self|FileSystem[A-Za-z]*Handle|localStorage|navigator)\b' src/lib)"
section 'AD-1, AD-10: forbidden globals' \
  "$(code '\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket)\b' src mcp_servers)"

# AD-2 --------------------------------------------------------------------
section 'AD-2: port methods in source.ts (spine lists four)' \
  "$(grep -nE '^[[:space:]]+[a-zA-Z]+\(.*\): ' src/lib/source.ts)"
section 'AD-2: handle use outside src/adapters' \
  "$(code 'showDirectoryPicker|getFile\(|\.values\(\)|FileSystem[A-Za-z]*Handle' src | grep -v '^src/adapters')"
section 'AD-2: picker call' "$(grep -n 'showDirectoryPicker(' src/adapters/fsaSource.ts)"

# AD-3 --------------------------------------------------------------------
section 'AD-3: local React state' "$(prod 'useState|useReducer' src)"
section 'AD-3: store subscription' "$(prod 'useSyncExternalStore' src/ui)"
section 'AD-3: dispatch and source calls, in order' "$(grep -nE '[^/]source\.|dispatch\(' src/lib/controller.ts)"
section 'AD-3: reducer imports' "$(grep -nE '^import' src/lib/reducer.ts)"

# AD-4 --------------------------------------------------------------------
section 'AD-4: childId and manual path joins' "$(prod "childId|\\+ *'/'" src)"
section 'AD-4: status key' "$(code 'u0000' src | grep -v '\.test\.')"
section 'AD-4: nodes type' "$(grep -nE 'nodes:' src/lib/state.ts)"

# AD-5, AD-6 --------------------------------------------------------------
section 'AD-5: generation and requestId in the controller' "$(grep -nE 'generation|requestId' src/lib/controller.ts)"
section 'AD-6: try and catch' "$(prod '\b(try|catch)\b' src/lib/controller.ts src/ui)"

# AD-7 --------------------------------------------------------------------
section 'AD-7: sort and Intl' "$(prod 'compareEntries|\.sort\(|localeCompare|Intl\.' src)"
section 'AD-7: formatting inside the UI' "$(prod 'format(Date|Size|Type)|toLocale|toFixed' src/ui src/adapters)"
section 'AD-7: U+202F in format.ts' "$(LC_ALL=C grep -n $'\xe2\x80\xaf' src/lib/format.ts)"

# AD-8 --------------------------------------------------------------------
section 'AD-8: exported selectors (spine lists three)' "$(grep -nE '^export function select' src/lib/selectors.ts)"
section 'AD-8: ARIA' "$(prod 'aria-|role=' src/ui)"
section 'AD-8: forbidden svg attributes' "$(prod '\b(width|height|strokeWidth|stroke-width)=' src/ui)"
section 'AD-8, AD-9: style prop' "$(prod 'style=' src)"
section 'AD-8: strings chosen by components' "$(prod 'TEXT\.' src/ui)"

# AD-9 --------------------------------------------------------------------
design_gaps() {
  [ -n "$design" ] || { echo 'DESIGN.md not found'; return; }
  local flat row n decl name value key
  flat=$(tr -d "'\"" < "$design")
  grep -nE '^[[:space:]]*--[a-z0-9-]+:' src/ui/tokens.css | while IFS= read -r row; do
    n=${row%%:*}
    decl=${row#*:}
    name=$(printf '%s' "$decl" | sed -E 's/^[[:space:]]*--([a-z0-9-]+):.*/\1/')
    value=$(printf '%s' "$decl" | sed -E 's/^[^:]+:[[:space:]]*//; s/;[[:space:]]*$//')
    case $name in
      color-*) key=${name#color-} ;;
      spacing-*) key=${name#spacing-} ;;
      rounded-*) key=${name#rounded-} ;;
      *) continue ;;
    esac
    if ! printf '%s\n' "$flat" | grep -Fqi -e "  $key: $value"; then
      echo "src/ui/tokens.css:$n --$name: $value"
    fi
  done
}

section 'AD-9: css files' "$(git ls-files 'src/*.css')"
section 'AD-9: literals outside tokens.css' "$(grep -nE '#[0-9a-fA-F]{3,8}\b|[0-9](px|rem|em)\b' src/ui/app.css)"
section 'AD-9: custom properties defined outside tokens.css' "$(grep -nE '^[[:space:]]*--' src/ui/app.css)"
section 'AD-9: color-scheme' "$(grep -n 'color-scheme' src/ui/*.css index.html)"
section 'AD-9: hex in tsx' "$(prod '#[0-9a-fA-F]{3,8}\b' src/ui)"
section 'AD-9: token count' "$(grep -cE '^[[:space:]]*--' src/ui/tokens.css)"
section 'AD-9: color/spacing/rounded tokens without the same key and value in DESIGN.md (typography: compare by reading)' \
  "$(design_gaps)"

# AD-10 -------------------------------------------------------------------
config_gaps() {
  local file=$1 literal
  shift
  for literal in "$@"; do
    grep -Fq -- "$literal" "$file" || echo "MISSING in $file: $literal"
  done
}

section 'AD-10: scripts' "$(grep -nE '"(check|prepare)":' package.json)"
section 'AD-10: exact check command' \
  "$(grep -Fc '"check": "tsc -b && oxlint --deny-warnings && stylelint \"src/**/*.css\" && vitest run"' package.json)"
section 'AD-10: hook' "$(ls -l .githooks/pre-commit; grep -n 'npm run check' .githooks/pre-commit; echo "core.hooksPath=$(git config core.hooksPath)")"
section 'AD-10: oxlint config gaps (config only; does not prove the rule fires)' "$(config_gaps .oxlintrc.json \
  'react/forbid-dom-props' 'no-restricted-imports' 'no-restricted-globals' '"src/lib/**"' '"src/ui/**"' \
  '"react"' '"react/*"' '"react-dom"' '"react-dom/*"' '"**/ui"' '"**/ui/**"' '"**/adapters"' '"**/adapters/**"' \
  '"window"' '"globalThis"' '"self"' '"document"' \
  '"localStorage"' '"sessionStorage"' '"indexedDB"' '"fetch"' '"XMLHttpRequest"' '"WebSocket"')"
section 'AD-10: stylelint config gaps (config only; does not prove the rule fires)' "$(config_gaps .stylelintrc.json \
  'color-no-hex' 'color-named' 'function-disallowed-list' 'unit-disallowed-list' \
  'selector-pseudo-class-disallowed-list' 'property-disallowed-list' \
  'declaration-property-value-disallowed-list' 'media-feature-name-disallowed-list' \
  '"src/ui/tokens.css"' '"px"' '"rem"' '"em"' '"hover"' '"pointer"' '"prefers-color-scheme"')"
section 'AD-10: stylelint plugins (spine: none)' "$(grep -n 'plugins' .stylelintrc.json)"

# AD-11 -------------------------------------------------------------------
test_files() {
  local f
  for f in $(git ls-files 'src/*.test.*' 'mcp_servers/*.test.*'); do
    printf '%s vitest-import=%s tests=%s\n' "$f" \
      "$(grep -c "from 'vitest'" "$f")" \
      "$(grep -cE '^[[:space:]]*(it|test)(\.each)?\(' "$f")"
  done
}

fr_coverage() {
  local i
  for i in 1 2 3 4 5 6 7 8; do
    printf 'FR-%s: %s describes\n' "$i" \
      "$(grep -rE "describe\(.*FR-$i\b" src --include='*.test.*' | wc -l | tr -d ' ')"
  done
}

section 'AD-11: vite config' "$(grep -nE "defineConfig|environment|globals" vite.config.ts)"
section 'AD-11: test files' "$(test_files)"
section 'AD-11: describe without FR- in src (includes nested)' \
  "$(grep -rnE "^[[:space:]]*describe\(" src --include='*.test.*' | grep -v "describe('FR-")"
section 'AD-11: describe in mcp_servers (outside the spine structure)' \
  "$(grep -rnE "^[[:space:]]*describe\(" mcp_servers --include='*.test.*')"
section 'AD-11: FR coverage' "$(fr_coverage)"
section 'AD-11: formatDate in tests without an explicit timeZone' \
  "$(grep -rnE 'formatDate\([^,)]*\)' src --include='*.test.*')"
section 'AD-11: fake capabilities' \
  "$(grep -nE 'function deferred|failAfter\?|failMeta:|supported\?' src/test/fakeSource.ts)"

# check-green-every-commit ------------------------------------------------
section 'check-green: skipped or focused tests' "$(code '\.(skip|only|todo)\b|\bxit\(|\bxdescribe\(' src mcp_servers)"
section 'check-green: suppressions' \
  "$(grep -rnE 'oxlint-disable|eslint-disable|stylelint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck' src mcp_servers)"
section 'check-green: lint and hook history' "$(git log --format='%h %ad %s' --date=short -- .oxlintrc.json .stylelintrc.json .githooks/pre-commit)"
section 'check-green: merge commits (a GitHub merge does not run the local hook)' "$(git log --merges --format='%h %an %s')"
section 'check-green: open deferred items mentioning a red state' "$(grep -nE 'אדום|\bred\b' "$specs_dir/deferred-work.md")"

# spec-records-progress ---------------------------------------------------
spec_counts() {
  local f
  for f in "$specs_dir"/spec-*.md; do
    printf '%s done=%s open=%s tasks-section=%s %s\n' "$(basename "$f")" \
      "$(grep -cE '^[[:space:]]*- \[x\]' "$f")" \
      "$(grep -cE '^[[:space:]]*- \[ \]' "$f")" \
      "$(grep -cE '^## Tasks' "$f")" \
      "$(grep -m 1 -E '^status:' "$f")"
  done
}

section 'spec-records-progress: counts' "$(spec_counts)"
section 'spec-records-progress: unticked' "$(grep -nE '^[[:space:]]*- \[ \]' "$specs_dir"/spec-*.md)"

# manual-spike-before-specs -----------------------------------------------
spec_times() {
  local f
  for f in "$specs_dir"/spec-*.md; do
    printf '%s first-commit: %s\n' "$(basename "$f")" \
      "$(git log --format='%h %ad' --date=iso -- "$f" | tail -n 1)"
  done
}

spine_dir=${spine%/*}
section 'manual-spike: spike lines in the architecture memlog' \
  "$(grep -nEi 'spike|manual check' "$spine_dir/.memlog.md")"
section 'manual-spike: architecture commits' "$(git log --format='%h %ad %s' --date=iso -- "$spine_dir")"
section 'manual-spike: first commit of each spec' "$(spec_times)"

# prebuilt-scope-handoff --------------------------------------------------
section 'prebuilt-scope: mentions in specs' \
  "$(grep -nE 'נבנה מראש|לא לבנות מחדש|קיים, לא|כבר (DFS|רקורסיבי|קיים)' "$specs_dir"/spec-*.md)"

# triage (review-known-rejections, and every other rule) ------------------
# One section per spec, so that even the full output of each stays short.
for spec in "$specs_dir"/spec-*.md; do
  section "triage rejections: $(basename "$spec" .md)" "$(triage_rejections "$spec")"
done

# file-type-by-extension --------------------------------------------------
section 'file-type: .type reads other than action, row and view fields' \
  "$(code '\.type\b' src | grep -vE '\b(action|row|r|view|preview|details)\.type\b')"
section 'file-type: lint rule' "$(grep -nE 'no-restricted-properties|"object": "(file|blob)"' .oxlintrc.json)"

# ---------------------------------------------------------------- worktree

if [ -n "$only" ]; then
  if [ "$matched" -eq 0 ]; then
    echo "audit.sh: no section title contains: $only" >&2
    exit 2
  fi
  exit 0
fi

after=$(snapshot)
if [ "$before" = "$after" ]; then
  section 'WORKTREE' 'UNCHANGED (git status and diff checksum match the start of the run)' all
  exit 0
fi
section 'WORKTREE' "CHANGED
--- before
$before
--- after
$after" all
exit 1

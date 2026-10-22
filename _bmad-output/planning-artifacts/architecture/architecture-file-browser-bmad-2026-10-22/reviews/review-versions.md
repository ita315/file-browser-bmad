# Review: versions & reality-check lens

Spine: `ARCHITECTURE-SPINE.md` (2026-10-22). Reviewer lens: were the committed decisions checked against what is live today, or written from memory?
How it was checked: `npm view` and `npm pack`/`npm i --ignore-scripts` in an isolated scratchpad, smoke configs run for real (oxlint 1.89.0, stylelint 17.16.0, vitest 5.0.5 + jsdom 30.1.3, tsc 6.0.3 on Node v24.22.1), nodejs.org/dist/index.json, and a web search for `attr()`.

**Verdict:** The stack is real and current, and every tool claim holds up when run. Fix three gaps before the first story: the FSA picker types, the `vitest` config location, and holes in the lint rules.

## 1. Stack table vs registry (2026-10-22)

| Package | Spine | Latest on npm | create-vite 9.3.1 react-ts pins | Status |
|---|---|---|---|---|
| create-vite | 9.3.1 | 9.3.1 | — | OK |
| typescript | ~6.0.3 | 7.0.2 (latest), 6.0.3 | ~6.0.3 | OK (matches template) |
| react / react-dom | ^19.3.1 | 19.3.1 | ^19.3.1 | OK |
| vite | ^8.3.4 | 8.3.5 | ^8.3.4 | OK (caret takes 8.3.5) |
| @vitejs/plugin-react | ^6.1.2 | 6.1.2 | ^6.1.2 | OK |
| oxlint | ^1.89.0 | 1.89.0 | ^1.88.0 | OK (raised on purpose; fine) |
| stylelint | ^17.16.0 | 17.16.0 | — | OK, engines node >=20.19 |
| vitest | ^5.0.5 | 5.0.5 | — | OK, peer vite ^6‖^7‖^8, engines node ^22.12‖^24 |
| jsdom | ^30.1.3 | 30.1.3 | — | OK, engines node ^24.15 (24.22.1 is fine) |
| @testing-library/react | ^16.3.3 | 16.3.3 | — | OK |
| @testing-library/dom | ^10.4.2 | 10.4.2 | — | OK |
| @testing-library/user-event | ^14.6.8 | 14.6.8 | — | OK |
| Node.js | 24 LTS (24.22.1) | v24.22.1 is the newest 24.x; v26.12.1 is current but not yet LTS | @types/node ^24.19.2 | OK. See note N1 |

The template also ships `@types/node`, `@types/react` and `@types/react-dom` ^19.3.0. The table leaves them out. That's acceptable because the template brings them in.

## 2. Claims checked by running them

| Claim | Result | Evidence |
|---|---|---|
| oxlint 1.89 `overrides` + `files` globs | **Works** | Overrides on `src/core/**` and `src/ui/**` applied separately |
| oxlint `no-restricted-imports` with `paths` + `patterns` (`**/ui/**`, `**/adapters/**`) | **Works**, with gaps (finding F3) | `../ui/b`, `../adapters/fsaSource` and `./../../src/adapters/x` all flagged |
| oxlint `react/forbid-dom-props` `{forbid:["style"]}` | **Works** | `<div style>` flagged. `<Foo style>` not flagged (DOM-only by design) |
| oxlint `no-restricted-globals` | **Works for bare identifiers only** (F3) | `localStorage`, `fetch` and `WebSocket` flagged. `window.localStorage` and `globalThis.fetch` **not** flagged |
| stylelint 17 core `color-no-hex`, `color-named`, `function-disallowed-list`, `unit-disallowed-list` | **All exist and work** | Each fired on a fixture |
| stylelint `overrides` to exempt `tokens.css` | **Works** | `overrides: [{files:["**/tokens.css"], rules:{…: null}}]` made tokens.css clean |
| stylelint parses `calc(attr(data-depth type(<number>), 0) * var(--spacing-indent))` | **Parses, no false positive** | — |
| Chrome 133+ typed `attr()` in any property | **True** | Chrome 133 (Feb 2025) shipped CSS Values 5 `attr()` with `type()`, usable in any property ([Chrome blog](https://developer.chrome.com/blog/advanced-attr), [133 beta](https://developer.chrome.com/blog/chrome-133-beta)). Firefox and WebKit don't have it, which doesn't matter because FSA is Chromium-only anyway |
| `tsc -b` works with the template | **True** (`build` script is `tsc -b && vite build`, solution tsconfig with app/node refs) | Caveats in F1 and F2 |
| Vitest 5 + jsdom 30 | **Works** | Smoke test passed on Node 24.22.1 (jsdom env, `Intl` en-US with U+202F replaced gave `Oct 22, 2026, 3:20 PM` with `timeZone:'UTC'`) |
| "typescript-eslint doesn't support TS 7" | **Factually true, but the wrong reason** (F4) | `typescript-eslint@8.72.0` peer `typescript: >=4.8.4 <6.1.0` |
| Template uses oxlint, not ESLint | **True** | `_oxlintrc.json` with plugins react/typescript/oxc; `"lint": "oxlint"` |

## 3. Findings

### F1 (high): `showDirectoryPicker` doesn't type-check, so `tsc -b` fails on the first adapter commit
TS 6.0.3 `lib.dom.d.ts` has `FileSystemDirectoryHandle` and the async iterators `values()`/`entries()`, but **not** `window.showDirectoryPicker`. That API is WICG-only and not in the TS DOM lib. Verified: `TS2339: Property 'showDirectoryPicker' does not exist on type 'Window & typeof globalThis'` with the template's `lib: ["ES2023","DOM"]`. AD-2 assigns this call to `fsaSource.pickRoot`, and AD-10 makes `tsc -b` gate every commit.
**Fix:** In AD-2 or the Structural Seed, add `src/adapters/fsa.d.ts`, a small ambient declaration that augments `Window` with `showDirectoryPicker(options?: { mode?: 'read' | 'readwrite'; id?: string; startIn?: … }): Promise<FileSystemDirectoryHandle>`. The other option is the devDependency `@types/wicg-file-system-access@2023.10.7`, but it is old and redeclares types that lib.dom now has, so the local `.d.ts` is preferred. Keep it under `adapters/` so core never sees it.

### F2 (medium): Where the Vitest config goes and its types under `tsc -b`
The spine names Vitest and jsdom but never says where `environment: 'jsdom'` is configured. The template's `vite.config.ts` uses `defineConfig` from `'vite'` and is type-checked by `tsconfig.node.json`. Adding `test: {…}` there fails `tsc -b`, because Vite's `UserConfig` has no `test` key. The test files themselves live in `src/` under `tsconfig.app.json` with `types: ["vite/client"]`. That works only if tests import `describe/it/expect` from `'vitest'` explicitly, with no `globals: true`.
**Fix:** In AD-10 or AD-11, state: "In `vite.config.ts`, import `defineConfig` from `'vitest/config'` and set `test: { environment: 'jsdom' }`. Leave `globals` off (vitest's default), and tests import from `'vitest'` explicitly." Add `jsdom`, `vitest` and the three `@testing-library/*` packages as devDependencies in the Stack note, because the template doesn't ship them.

### F3 (medium): The AD-1/AD-10 lint rules have bypasses the spine doesn't mention
Verified with oxlint 1.89:
- `no-restricted-globals` catches only bare identifiers. `window.localStorage`, `window.fetch` and `globalThis.indexedDB` all pass. AD-1 also says core never touches `window`, and no rule enforces that.
- Listing `react`/`react-dom` under `paths` blocks only those exact specifiers. `react-dom/client` and `react/jsx-runtime` pass unless they are also given as patterns. In the smoke test, `react-dom/*` had to be added as a pattern before `react-dom/client` was flagged.
- A pattern `**/ui/**` doesn't match a bare `'../ui'` (a directory index import). That's minor, since there are no aliases or index files by convention.

**Fix:** In AD-10, spell out the core override as `paths: ["react","react-dom"]` + `patterns: ["react/*","react-dom/*","**/ui","**/ui/**","**/adapters","**/adapters/**"]`. Add `window`, `globalThis` and `self` to `no-restricted-globals` **only in the `src/core/**` override**. The adapter needs `window`, and blocking those names in core closes the `window.localStorage` route too. For ui/adapters, add `no-restricted-properties` for `window.localStorage`/`window.fetch` etc. (oxlint has no such rule today, so check `oxlint --rules`). Otherwise record it as an accepted gap. Also note that oxlint exits 0 on warnings, so add `--deny-warnings` to the check command if warnings should block.

### F4 (low): The TS 6 vs 7 rationale points at a tool the project doesn't use
TS 7.0.2 is `latest` on npm. The note says "we stay on 6.0 … because typescript-eslint doesn't support 7 yet". That's true (peer `<6.1.0`), but the project uses oxlint, not typescript-eslint, so it isn't the reason. The real reason is that the template pins `~6.0.3`, and moving to the native TS 7 compiler (tsgo) is untested with `tsc -b` plus the template's options (`erasableSyntaxOnly`, `allowImportingTsExtensions`, `module: nodenext` in the node config).
**Fix:** Change the note to say we stay on `~6.0.3` because create-vite 9.3.1 pins it and TS 7 is a new native compiler the template hasn't adopted. Mark it as a 🟢 change for later.

## 4. Notes (no action needed)
- **N1, Node:** 24.22.1 is the newest 24.x and is LTS (Krypton). Node 26 (v26.12.1, 2026-10-21) is due to become LTS around the end of October 2026. 24 remains supported, and vitest 5 and jsdom 30 support both, so no change is needed. You could write "24 LTS (≥24.15, required by jsdom 30)" so the real lower bound is visible.
- **N2:** The typed `attr()` fallback `0` with `type(<number>)` is valid. If `data-depth` is missing, the result is `0 * var(--spacing-indent)`. Chrome 133+ is stated, which suits a Chromium-only FSA app.
- **N3:** stylelint 17 runs with no `extends` and no plugins. The four core rules are enough. `transparent` and `currentColor` aren't flagged by `color-named`, which is the expected behavior.
- **N4:** oxlint respects `.gitignore` for `node_modules`. In the scratch dir, with no git repo, it linted `node_modules`. The project is a git repo, so this is fine, but `oxlint src` is a safer target in `npm run check`.

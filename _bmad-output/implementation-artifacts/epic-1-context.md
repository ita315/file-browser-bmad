# Epic 1 Context: Folder Browser V1

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ita opens the app in desktop Chrome, picks a local folder, expands and collapses folders in a tree, and sees the details of any file or folder in a panel attached to the right of the tree. The app is strictly read-only. Unreadable items are marked inline and never break the rest of the tree. The epic is done when the full journey (pick, expand/collapse, click a file and a folder, hit a blocked folder) works end to end on a real folder. It also proves the course's BMAD flow, so every commit must keep `npm run check` green.

## Stories

- Story 1.1: Project setup and root folder selection
- Story 1.2: Expand and collapse folders, including unreadable items
- Story 1.3: Item selection and details panel

## Requirements & Constraints

- **Read-only, local, stateless:** the picker opens with `mode: 'read'`. No writes, no network, and nothing kept between page loads (no `localStorage`/IndexedDB). Any picker failure (cancel, blocked, denied) behaves like cancel: state unchanged, no message.
- **Root replacement:** every successful pick, even of the same folder, replaces the whole tree, re-reads it, clears the selection and resets the panel to empty. The root shows expanded, with `Loading…` below it until its contents arrive.
- **Unsupported browser:** if `showDirectoryPicker` is missing, the top bar shows only `This browser is not supported. Please use Chrome on desktop.` and no button.
- **Tree:** clicking the chevron toggles the folder and never selects. Clicking the name selects and never toggles, and the root behaves like any other folder. Each folder is read at most once per root pick, including when the read failed (retry means picking the root again). Collapsing during a load does not cancel it. Status rows: `Loading…` and `Empty folder`.
- **Order:** show every item, including hidden ones. Folders come before files, sorted naturally and case-insensitively (`A, b, c`, `file2` before `file10`), with a deterministic tiebreak (`readme`/`README`).
- **Unreadable (three cases):** a folder that fails before its first entry shows `Unable to read this item` next to its name and has no chevron. A file whose metadata read fails shows the same message and does not stay selected. A listing that fails mid-way keeps the entries it got, sorted, plus one nameless `Unable to read this item` status row after the folder's whole subtree. Clicking an already-known unreadable item clears the selection and does not touch the disk.
- **Details:** with nothing selected, the panel shows only `Select a file to see its details`. A file shows `Name`, `Type`, `Size`, `Modified` in that order, and `Name` plus `Loading…` while its read is in flight. A folder shows only `Name` and `Type: Folder`, with no disk read and no toggle.
- **Formats:** Type is the text after the last dot, upper-cased, or `—` when there is no dot or the dot is the first or last character (`archive.tar.gz`→`GZ`, `.env.local`→`LOCAL`, `.gitignore`→`—`). Size uses decimal units B/KB/MB/GB/TB, at most one decimal, round half up, no `.0`, rollover at 1000, capped at TB, independent of locale. Use the PRD's size table as the test table. Date looks like `Oct 22, 2026, 3:20 PM` in local time, and unknown dates show `—`.
- **Stale results are dropped:** if A is clicked and then B, and A's details arrive last, the panel shows B. Contents from an old root never enter a new tree.
- **Quality:** every FR (FR-1..FR-8) has at least one automated test against the fake source, with a `describe` name that starts with the FR id. The picker itself, the panel's position and the FR-5 `chmod 000` experiment are checked by hand.
- All UI text is in English, including dates.

## Technical Decisions

- **Stack:** scaffold from `create-vite` 9.3.1 with the `react-ts` template. TypeScript ~6.0.3, React ^19.3.1, Vite ^8.3.4, oxlint (keep the template's linter, no ESLint), stylelint, Vitest ^5 with jsdom and Testing Library. Node ≥24.15, Chrome 133+ (needed for typed `attr()`).
- **Layers (one-way deps):** `src/lib` holds pure TS with no React, `window` or FSA handles. `src/adapters` holds the FSA implementation. `src/ui` holds React and CSS and never imports adapters. `src/test` holds the fake. `src/main.tsx` is the composition root. **The logic folder is `src/lib`, never `src/core`.** Use relative imports and no aliases.
- **Port** (`src/lib/source.ts`): `DirectorySource { isSupported(); pickRoot(): Promise<Entry|null>; listChildren(ref): AsyncIterable<Entry>; readFileMeta(ref): Promise<{size, lastModified: number|null}> }`. `SourceRef` is opaque (branded). `pickRoot` never throws, and failures arrive only as rejected promises or a rejected `next()`. Declare `showDirectoryPicker` in `src/adapters/fsa.d.ts` instead of adding an `@types` package. Handles live only in memory.
- **State:** one immutable `AppState` (`supported`, `generation`, `nodes: Map<NodeId, TreeNode>`, `expanded: Set`, `selectedId`, `details`), changed only by a pure reducer. An action that gets dropped returns the same reference. `createController(source)` exposes `getState`, `subscribe`, `openFolder`, `toggle(id)` and `select(id)`. Only the controller decides on I/O. The UI reads state through `useSyncExternalStore` plus selectors and keeps no tree, selection or details state of its own.
- **IDs:** the root is `''`, and `childId(parent, name)` joins names with `/` (defined only in `state.ts`). A status row's key is `parentId + '\u0000status'`. The same ids serve as React keys.
- **Staleness:** `rootPicked(gen, entry)` is atomic and bumps `generation`. Every async action carries its `gen`. `details.requestId` increments on each file select. `metaLoaded` is dropped when gen or requestId changed. `metaFailed` is dropped only when gen changed: it always marks the file `unreadable`, and clears the selection only if the requestId still matches. Re-selecting the already-selected file is a no-op. All staleness checks live only in the reducer.
- **Errors as data:** a folder has `load: unloaded|loading|loaded|failed` and `truncated`. `unreadable` applies to files only. The controller wraps both the `listChildren` call and the `for await` loop in its try. Folder contents enter state all at once when the read ends, and the reducer sorts them. A selected folder that then fails to open **stays selected**.
- **Pure helpers:** `compareEntries` in `sort.ts` uses `Intl.Collator('en', {numeric:true, sensitivity:'base'})` with a code-point tiebreak. `format.ts` holds `formatType`, `formatSize` (integer arithmetic) and `formatDate(ms, timeZone?)`, which uses `en-US` medium/short and replaces U+202F with a regular space. Tests always pass `timeZone`.
- **Selectors** (`selectors.ts`): `selectTopBar`, `selectVisibleRows` (a flat DFS list of item and status rows, with at most one status row per open folder at `depth + 1`) and `selectDetails`, all returning ready-made strings. Components render only what the selectors return.
- **Strings:** every UI string lives once in `src/lib/text.ts` (including `…` U+2026), and tests import the same constants.
- **Tokens:** `src/ui/tokens.css` is the only file with literal values. Define light values only, as `--color-*`, `--spacing-*`, `--typography-*` and `--rounded-*`, plus `color-scheme: light`, and no `light-dark()`. Delete the template's `index.css` and `App.css`. `app.css` holds a single `<button>` reset.
- **Enforcement:** `npm run check` = `tsc -b && oxlint --deny-warnings && stylelint "src/**/*.css" && vitest run`. Lint blocks React, ui and adapters imports in lib; adapters imports in ui; `style` props; and storage/network globals. Stylelint blocks hex, named colors, color functions and px/rem/em outside tokens, plus `:hover`, `transition`, `animation`, `cursor: pointer` and `prefers-color-scheme` everywhere. A pre-commit hook in `.githooks/pre-commit` is wired via `"prepare": "git config core.hooksPath .githooks"`, with no husky.
- **Tests:** Vitest config lives in `vite.config.ts` using `defineConfig` from `'vitest/config'`, with the jsdom environment and no globals. `src/test/fakeSource.ts` supports manual deferreds, failure before the first entry, after N entries or in `readFileMeta`, and `isSupported: false`. Most tests target the controller and selectors, with a few RTL tests for the button wiring.

## UX & Interaction Patterns

- **Layout:** a full-width top bar holding `Open folder…` (wording never changes), followed by the grey, single-line, ellipsised root name once a root is picked. Below it, a fixed-width tree on the left that scrolls vertically on its own, and an attached, flat details panel on the right (no shadow, no radius). The app has a minimum width and the whole page scrolls horizontally below it.
- **Tree row:** one element with `data-depth`, containing a chevron `<button>` (or a same-width spacer for files and failed folders) and a name `<button>` that holds the icon, the name and any unreadable message and stretches to the row's end. Indentation comes from `calc(attr(data-depth type(<number>), 0) * var(--spacing-indent))`, never inline style. Icons are inline SVG with `currentColor` and classes only (no width, height or stroke-width attributes): one folder icon and one file icon. The chevron points right when closed and down when open, with no animation.
- **Selected row:** the `selected` background plus an `inset` box-shadow accent bar. The icon and chevron switch to the text color.
- **Status and unreadable text:** grey italic. The unreadable message always shows in full and the name truncates before it. The empty panel prompt is grey and not italic.
- **Details panel:** a label/value grid with label width `details-label-width` and `tabular-nums` values. The full name wraps (`overflow-wrap: anywhere`).
- **Bidi:** every name (tree, panel, top bar) gets `dir="ltr"` plus `unicode-bidi: isolate`, not `dir="auto"`. Names in the tree and top bar truncate with `…`, with no tooltip and no horizontal tree scroll.
- **No hover, no transitions, default cursor, light only, no ARIA beyond native elements.** The focus ring appears only on `:focus-visible`: outside the element in the top bar, inset inside tree rows.
- **Hidden selection persists:** collapsing the parent of the selected item hides its row, but the item stays selected and the panel stays unchanged.

## Cross-Story Dependencies

- 1.2 depends only on 1.1, and 1.3 on 1.1 and 1.2. There are no forward dependencies.
- 1.1 lays the foundation: scaffold, enforcement, tokens, the port, the FSA adapter, the fake, the reducer and controller with `openFolder`, `compareEntries`, root-level selectors and the basic components. It may be split into a "setup and enforcement" story 1.0 without changing the others.
- 1.2 adds `toggle`, the load actions, the full `selectVisibleRows` and the full `TreeRow`. 1.3 adds `select`, the meta actions, the formatters, the full `selectDetails`, `DetailsPanel` and the selected-row styling.
- Manual FR-5 check (`chmod 000` in Chrome): Ita runs it once the adapter works and records which cases really fail. The automated tests cover all three cases through the fake, so this check does not block.

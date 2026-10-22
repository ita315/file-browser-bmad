---
type: review
lens: adversary (build-incompatibility between sibling units)
target: ../ARCHITECTURE-SPINE.md
date: 2026-10-22
---

# Adversarial review: ARCHITECTURE-SPINE (file-browser-bmad)

**Verdict:** The layering (AD-1/2/3/10) is solid. The state contract (AD-3/5/6/8) is too loose, though. Two developers could each follow every AD exactly and still build a controller, reducer, selectors and UI that do not work together. There are 14 holes below. Five of them can cause wrong behaviour that tests won't catch (H1, H2, H3, H6, H9). Fix those before stories are written.

Method: for each hole I picked two units one level down (**R** = reducer story, **C** = controller story, **S** = selectors story, **T** = tree UI story, **D** = details panel story, **A** = FSA adapter story, **F** = fake source story, **H** = `useAppState` hook). I show a reading of the spine each one could legally take, and how the two readings clash. Each hole ends with proposed rule text.

---

## H1. Who decides that a toggle starts a load (C vs R): the folder never loads, or loads twice

- AD-6 says "`toggle` does not start a read when `load !== 'unloaded'`". It does not say *who* checks this, or *when*.
- **R** reads AD-3 ("state changes only through the reducer") and handles `toggled(id)` by adding `id` to `expanded` and setting `load: 'loading'` when it was `unloaded`.
- **C** dispatches `toggled(id)` first, then checks `getState().nodes[id].load === 'unloaded'` before it calls `listChildren`. It sees `'loading'`, so it never calls the source. **The folder spins on `Loading…` forever.**
- The reverse case is also legal: C checks *before* it dispatches and also dispatches `loadStarted`, while R already sets `loading` inside `toggled`. That is harmless. But a third variant, where C calls `listChildren` and R also has an effect hook, reads the folder twice and breaks FR-3 "read once".

**Proposed rule (AD-6a, Load-start protocol):**
> "The controller is the only place that decides to start an I/O operation. Order inside `toggle(id)`: (1) `const s = getState()`; (2) `const startLoad = node.kind === 'directory' && !s.expanded.has(id) && node.load === 'unloaded'`; (3) `dispatch({type:'toggled', id})`, which only flips `expanded`; (4) if `startLoad`: `dispatch({type:'loadStarted', gen: s.generation, id})`, which sets `load:'loading'`, and then `listChildren`. The reducer never changes `load` in response to `toggled`. The same pattern applies in `select` and `openFolder`."

## H2. `metaFailed` for a file that is no longer selected (AD-5 vs AD-6 conflict)

- AD-5: "a file-details result is discarded if `selectedId` is no longer that file."
- AD-6: "`readFileMeta` failed → the file is marked `unreadable: true`, and **if it is still selected**, the selection is cancelled." The second half only makes sense if the action is *not* discarded when the file is no longer selected.
- **R1** follows AD-5 and discards `metaFailed` after A→B. File A stays readable.
- **R2** (or a test writer) follows AD-6 and marks A `unreadable` even after the user has moved on to B.
- The UI behaves differently, and tests written against one reading fail against the other. PRD FR-5: "the message appears next to the file's row", and "even when the failure is only discovered as a result of the click".

**Proposed rule (replaces the sentence in AD-5):**
> "`metaLoaded` is discarded if `generation` changed or if `details.requestId !== action.requestId`. `metaFailed` is discarded **only** if `generation` changed. Otherwise it always sets `nodes[id].unreadable = true`, and if `details.requestId === action.requestId` it also sets `selectedId = null` and `details = {status:'none'}`."

(Choose a different policy if you prefer, but there must be exactly one.)

## H3. Requesting the same file again (A, B, A): `selectedId` is not a sufficient token

- AD-5 discards a result when `selectedId !== fileId`. For the sequence A(1), B, A(2), the *result of A(1)* arrives while `selectedId === A`, so it is accepted. If A(1) failed and A(2) succeeded, or the reverse, the final state depends on arrival order: either A is unreadable and deselected even though the latest read succeeded, or the success of A(1) is shown and then A(2) fails afterwards.
- **C** may read the [ASSUMPTION] "re-read on every selection" and call `readFileMeta` again. **R** may decide that selecting a file that is already selected is a no-op. Together they produce a `details` that never returns from `loading`, because R doesn't reset it but C sends a second request that R discards.

**Proposed rule (AD-5, addition):**
> "`details` holds a monotonic `requestId` that the controller generates on every `select` of a file. Every `metaLoaded`/`metaFailed` carries `{gen, id, requestId}`. A result whose `requestId` differs from the current one is treated as stale (subject to H2). `select(id)` when `id === selectedId` and the file is already `ready` or `loading` does nothing (no read)."

## H4. `details` shape: two places where meta can be stored, and no shape for a folder

- In the classDiagram, `details: idle | loading | ready` has no payload, and `TreeNode` has no `size/lastModified`.
- **R** stores meta in `nodes[id].meta`, as a cache on the node. **S** reads `state.details.meta`. Result: an empty panel.
- For a folder (FR-8), **R** sets `details: 'ready'` because it is "ready". **D** sees `ready` and draws Size and Modified rows with `—`. That violates FR-8 ("without size and without date").
- `selectDetails` has no defined return type, so **D** and **S** guess different shapes.

**Proposed rule (to `state.ts` and AD-8):**
> ```ts
> type Details =
>   | { status: 'none' }
>   | { status: 'loading'; id: NodeId; requestId: number }
>   | { status: 'ready';   id: NodeId; requestId: number; size: number; lastModified: number | null };
> // Details is used only for files. Selecting a folder sets details = {status:'none'}; selectDetails derives the folder view from selectedId + node.kind.
> type DetailsView =
>   | { type: 'empty'; text: string }
>   | { type: 'loading'; name: string; text: string }
>   | { type: 'fields'; rows: { label: string; value: string }[] }; // file: 4 rows; folder: 2 rows
> ```
> Meta is not stored on `TreeNode`.

## H5. "unreadable" for a folder: two flags, and the chevron decision ends up in the UI

- `TreeNode` has both `load: 'failed'` and `unreadable: boolean`. AD-6 only defines `unreadable` for a file. **R** sets only `load:'failed'` on a folder. **S** builds the row's `unreadable` from `node.unreadable`, so a failed folder gets no message. FR-5 is broken in the most important case (the UJ-1 edge case).
- The `item` row has no field that tells **T** whether to draw a chevron. UX: "a folder that failed to open has no chevron, only its empty space, like a file". **T** has to work out `kind==='directory' && !unreadable` itself, which is logic in the UI (against AD-8). Or it gets it wrong.
- AD-8 says "in every item row, the chevron and the name are two separate `<button>`s". For a file and for a failed folder there is no chevron. Developer T1 renders a disabled `<button>` (an extra Tab stop, a focus ring on nothing). T2 renders a spacer. The two contradict each other, and T1 contradicts UX.

**Proposed rule (AD-8, row shape):**
> "`item` row = `{ type:'item', id, name, depth, icon:'file'|'folder', chevron:'none'|'collapsed'|'expanded', selected, unreadable }`. `unreadable` is computed in one place: `node.kind==='file' ? node.unreadable : node.load==='failed'`. `chevron` is `'none'` for a file and for a folder with `load==='failed'`. A chevron `<button>` is rendered only when `chevron !== 'none'`; otherwise an empty `<span>` the same width. `TreeNode.unreadable` is used only for files."

## H6. NodeId: separator at the root, and a name like `__proto__`

- AD-4: "the names from the root to the node, joined with `/`, and the root is `''`". **R** builds a child id as `${parentId}/${name}` → `'/src'`. **S/T tests** expect `'src'`. Fixtures and RTL tests break. Do the names include the root's name? It is not written.
- `nodes: Record<NodeId, TreeNode>` on a plain object: a real file named `__proto__` in the root gives id `'__proto__'`, and `nodes['__proto__'] = …` changes the prototype instead of adding a key. The file disappears from the tree. A name `constructor` or `hasOwnProperty` makes `id in nodes` return true before it was read. Hidden files are shown by design (FR-4), so this is a real input.

**Proposed rule (AD-4, tightened):**
> "`childId(parent, name) = parent === '' ? name : parent + '/' + name`. The root's name is not part of any id. `nodes` is a `Map<NodeId, TreeNode>` (or `Object.create(null)` with access only through a helper in `state.ts`). The only function that builds an id is `childId` in `state.ts`."

## H7. The `key` of a status row collides with item ids

- AD-4 makes the id the React key. AD-8 gives `status` rows a `key` of unspecified format. **S** picks `${parentId}/loading` or `status:${parentId}`. Either one collides with a real item: a file named `loading` in folder `parentId`, or a folder named `status:x` in the root. A duplicate React key means wrong rendering (rows "disappear" or get swapped).

**Proposed rule:**
> "The key of a status row is `parentId + '\u0000' + kind` (`kind ∈ loading|empty|truncated`). NUL cannot appear in a file name, so the key space is disjoint from NodeIds."

## H8. The root row: is it shown, at what depth, and who opens it

- PRD FR-3: "the root folder behaves like any other folder". So it has a chevron, it can be closed and it can be selected (FR-8). The spine never says whether `selectVisibleRows` emits a row for `''`. **S** emits the root at depth 0 with its children at depth 1. **T** draws the root name itself as a header, because it already appears in the top bar, and expects the rows to start at the children. Result: the root appears twice, or the indentation is off by one.
- Who opens the root at `openFolder`? **R** handles `rootPicked` by putting `''` in `expanded` and setting `load:'loading'`. **C** calls `toggle('')` after `rootPicked`. Toggle sees the root already `expanded`, so it closes it, or sees `loading` and does not read (see H1). Either way the root never loads.

**Proposed rule (AD-3/AD-8):**
> "`rootPicked(gen, entry)` is one atomic action: `generation = gen`, `nodes = {'': rootNode(load:'loading')}`, `expanded = {''}`, `selectedId = null`, `details = {status:'none'}`, and `supported` is kept. The controller follows it immediately with `listChildren(root)` carrying the new `gen`, without going through `toggle`. `selectVisibleRows` always starts with an `item` row for `''` at `depth: 0`, with a chevron, selectable. Its children are at `depth: 1`."

## H9. Where the generation is incremented, and which generation the root load carries

- AD-5: "on every successful root pick, `generation` goes up by 1". Does the reducer or the controller increment it? **R** increments inside `rootPicked`. **C** computes `gen = getState().generation + 1`, sends it, and *also* tags the root load with that gen. If R ignores `action.gen` and increments by itself, they agree by luck. If C dispatches `rootPicked` and then reads `getState().generation` (already +1) and adds 1 again, every root load is discarded and the root is stuck on `Loading…`.

**Proposed rule:**
> "The controller is the only one that computes a new generation: `const gen = getState().generation + 1`. `rootPicked` carries `gen`, and the reducer assigns `generation = action.gen`; it does not increment. Every operation captures `gen` **synchronously at command entry**, before the first `await`."

## H10. A folder that is selected or expanded and then fails

- AD-6 cancels the selection only for a file whose meta failed. Scenario: the user selects folder X by its name (FR-8, no read). She then opens it with the chevron, and the read fails. **R1** leaves X selected, so the panel shows `Name: X / Type: Folder` for an item PRD §3 defines as "unreadable, cannot be selected". **R2** cancels the selection, following FR-5 "an unreadable item cannot be selected". UX "a folder that failed to open … details panel: unchanged" supports R1. **This is a PRD/UX contradiction that the spine needs to resolve.**
- A failed folder stays in `expanded`. **S** may emit `Empty folder` for it (because `children.length === 0`), which is a wrong status row.

**Proposed rule (AD-6):**
> "`loadFailed` does not change `selectedId` (UX "unchanged" wins; the unselectability in FR-5 applies only to *a click* on an already-failed item). Under a folder with `load==='failed'`, `selectVisibleRows` emits no row at all, whatever `expanded` says. `Empty folder` is emitted only when `load==='loaded' && children.length===0 && !truncated`."

(If the PRD owner decides otherwise, record the decision explicitly. Leaving it silent invites both implementations.)

## H11. Where the truncated row goes, and its depth

- FR-5: "at the end of the list". When the last child is an expanded folder, **S1** puts the status row *right after the direct children*, before the subtree of the last child (if it inserts by direct-child index). **S2** puts it after the whole subtree, which is the natural result of DFS. Same depth? `depth` of the children, or of the parent? Not written.

**Proposed rule (AD-8):**
> "Status rows under folder P (`Loading…`, `Empty folder`, truncated `Unable to read this item`) have `depth = depth(P)+1`. The truncated row is emitted after P's whole subtree (post-order DFS). Under a given P there is at most one status row."

## H12. `useSyncExternalStore` against selectors that return new arrays

- AD-3 requires `useSyncExternalStore` and AD-8 requires selectors. **H** writes `useSyncExternalStore(subscribe, () => selectVisibleRows(getState()))`. Every call returns a new array, so React detects tearing and loops ("The result of getSnapshot should be cached"). Also, `expanded: Set` invites **R** to mutate in place (`state.expanded.add(id)`), so `getState()` returns the same reference and React never re-renders.

**Proposed rule (AD-3, addition):**
> "`getSnapshot` returns the `AppState` as-is. Selectors run in render, or inside `useMemo` on the state. The reducer is strictly immutable: a new object for every change (including a new `Set`/`Map`), and **the same reference** when an action is discarded (AD-5). A test checks that a discarded action returns `prev === next`."

## H13. FR-2: who calls `isSupported` and when, and what a reset does to it

- The capability map says `fsaSource.isSupported` and `AppState.supported`. But the UI cannot import the adapter (AD-1), and the controller exposes only three commands. **C** computes `supported` in `createController`. **main.tsx** passes `initialState` with `supported`. **R** resets "all the state" on `rootPicked` (AD-5: "all the state is reset") back to `initialState` with `supported: true` by default. In practice this is harmless because unsupported means no root is ever picked. But in the fake (`isSupported:false` plus a call to `openFolder` in a test), the outcome depends on the developer.

**Proposed rule:**
> "`createController(source)` sets `supported = source.isSupported()` exactly once, at creation. `openFolder()` when `!supported` returns immediately without calling `pickRoot`. A `rootPicked` reset keeps `supported`."

## H14. Error surface of `listChildren`: synchronous throw vs. rejected iteration; and where sorting happens

- AD-2: "`listChildren` may throw". **F** implements it as a regular function that throws synchronously for "fail before the first item". **A** implements an `async function*`, where the error arrives on the first `next()`. **C** wraps only the `for await` in try. With F, the synchronous throw happens at the `listChildren(...)` call, which may sit outside the try (for example `const it = source.listChildren(ref); try { for await … }`). The test passes against A and the app crashes against F, or the reverse.
- AD-7: "sorting happens once, when the content enters state". **C** sorts before dispatch; **R** sorts in the reducer. That is harmless twice, but if each one relies on the other, nothing sorts.

**Proposed rule:**
> "`listChildren` and `readFileMeta` never throw synchronously. Failures arrive only as a rejected `next()` or a rejected promise (both implementations are `async function*` / `async`). Sorting with `compareEntries` happens only in the reducer, in `loadSucceeded`/`loadTruncated`. The controller passes entries in arrival order (this is what F tests with reversed order)."

---

## Contradictions with the PRD/UX

1. **AD-8 "in every item row, the chevron and the name are two `<button>`s"** contradicts UX › Component Patterns: a file and a failed folder have **no** chevron, only empty space. See H5.
2. **AD-6 and AD-5 contradict each other** about `metaFailed` after the selection has moved on. See H2.
3. **PRD FR-5 ("an unreadable item cannot be selected") vs. UX State Patterns ("a folder that failed to open: panel unchanged")**, when the failed folder is the selected item. The spine is silent. See H10.
4. **The [ASSUMPTION] "re-read on every selection" vs. AD-6 "`select` on an unreadable item resets the selection"**: should `select` on a file already marked `unreadable` call `readFileMeta` again? AD-6 implies no read, while the assumption implies a read. Proposal: "`select` on an `unreadable` file or a `failed` folder does not call the source. The read is retried only after a new root pick (FR-3)."
5. **UX `tree-name` is "the whole row, from the icon to the edge"**, and `unreadable-message` is "part of the item's row". The spine does not say whether the message sits inside the name `<button>`. If T puts it outside, a click on the message does not cancel the selection. Proposal: "`unreadable-message` is rendered inside the name `<button>`."
6. **The `root-name` in the top bar has no selector.** AD-8 says "the components receive ready strings from the selectors", but there is only `selectVisibleRows` and `selectDetails`. TopBar will read `state.nodes[''].name` directly. Proposal: add `selectTopBar(state): { mode:'unsupported', text } | { mode:'picker', rootName: string | null }`.

## Lower-priority notes

- `formatDate` on `NaN`/`null` → `—`, but `File.lastModified` is always a number. Why `lastModified: number | null` in the port? Write down when the adapter returns `null` (proposal: never in V1; the type is kept for the fake).
- AD-10 blocks `fetch` and friends also in `src/test/`. That's fine, but say so explicitly so nobody adds an override.
- The Mermaid sequence diagram shows `selectStarted(gen, fileId)` without a `requestId`. Update it to match H3.

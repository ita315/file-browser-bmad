# Spine Pair Review — file-browser-bmad

## Overall verdict

**Adequate. Usable as a downstream contract once the 3 high findings are fixed.** Every `{path.to.token}` reference in both files resolves. Every color has a hex value and a light/dark pair. All 10 contrast ratios were recomputed and match the table. UJ-1 and FR-1 through FR-8 can all be traced, and every memlog decision appears in the spines without contradiction. The gaps are concentrated in three places. First, NFR-4 token completeness: the shadow, the 1px border width, italic and the tree focus-ring offset have no token. Second, an icon/chevron set is never specified. Third, a cluster of tree edge states sits between the PRD and the UX.

## 1. Flow coverage — strong

**What was checked:**
- UJ-1 (PRD §2.2) is the only journey in the sources. It has a Key Flow (EXPERIENCE.md L114–123) with a named protagonist (Ita), 6 numbered steps, a marked climax (step 5, matching the memlog "answer moment" decision) and a failure path (step 6, an unreadable folder).
- FR reachability: FR-1 and FR-2 via the top bar and the state table (L72–75, L85). FR-3 via the arrow and name rows plus the Loading/Empty states. FR-4 via the tree (the IA source column; `.git` appears in the ASCII sketch). FR-5 via 4 state rows. FR-6, FR-7 and FR-8 via the details panel states (L80–84).
- Picker cancel/failure is covered in the state table rather than in the flow, which is acceptable.

### Findings
- **low** The flow says it was "copied from PRD §2.2" (L116), but the steps add UX content: Loading, the colors, Hebrew rendering. That is fine as elaboration, but the label is inaccurate and could make a consumer treat the added content as PRD-sourced. (EXPERIENCE.md L116). *Fix:* reword to "based on PRD §2.2, expanded with UX states".
- **low** FR-4 shows hidden items (`.git`), but neither spine says whether hidden items get any visual treatment. Finder dims them, so a Finder-literate developer may add dimming. (DESIGN.md Components / EXPERIENCE.md Component Patterns). *Fix:* add one line: "Hidden items are styled like any other item (no dimming)".

## 2. Token completeness — adequate

**What was checked:**
- All 16 color tokens are hex, kebab-case and paired `X`/`X-dark`. The direction-B palette matches `.working/color-themes-1.html` exactly, and the amber `warn` token was correctly dropped.
- Typography (4 roles), rounded (sm, md) and spacing (a 6-step scale plus 8 named tokens) are well formed.
- All 29 distinct `{…}` references across both files resolve.
- All 10 contrast ratios were recomputed with WCAG luminance and match to one decimal. Load-bearing pairs are covered: text, muted, button, selection bar and focus ring.

### Findings
- **high** The details-panel shadow cannot pass through the stated `light-dark()` pipeline, and it carries colors that are not in the palette. `shadow` (2 layers, `rgb(16 24 40 / …)`) and `shadow-dark` (1 layer, `rgb(0 0 0 / 0.45)`) live in `components`, not in `colors`. `light-dark()` accepts only `<color>`, so the pair cannot become "one variable via light-dark()" as DESIGN.md L138 states. The raw rgb values also break DESIGN's own Don't: "a color that doesn't appear here" (L239). (DESIGN.md L117–118, L210). *Fix:* add `shadow-color` / `shadow-color-dark` (and, if needed, a second layer color) to `colors`. Define the geometry in a single `elevation`/`shadow` token with the same layer count in both modes, so only the colors switch.
- **high** Some design values are used with no token. Under NFR-4 each of these forces a hard-coded value or an ad-hoc variable:
  - `1px` border width (top-bar L71, tree L89)
  - `font-style: italic` (status-row L107, unreadable-message L111; not representable in `typography.status`)
  - the negative focus-ring offset on tree rows (L230; magnitude unspecified)
  - the 12px panel margin from the elevation assumption (L212; not in `components.details-panel`)
  - the chevron slot width (L202 says "14px" but only `icon-size` is tokenized)
  - `tabular-nums` (acceptable as a keyword)

  *Fix:* add `spacing.border` (or a `borders` group), `components.details-panel.margin: '{spacing.3}'`, `components.tree-row.chevron-size: '{spacing.icon}'` and `components.focus-ring.offset-inset`, and move italic into the status/unreadable component tokens explicitly as `fontStyle`, so the generator emits it.
- **medium** `tree-row-selected.indicator` is a prose string (`'inset {spacing.selection-bar} at inline-start, {colors.accent}'`), not a CSS value. A generator cannot emit it. (DESIGN.md L103). *Fix:* split it into `indicator-width: '{spacing.selection-bar}'` and `indicator-color: '{colors.accent}'`, and keep the inset box-shadow guidance in prose.
- **medium** `components.tree-row-selected` has no `icon-color: '{colors.text}'`, yet prose (L226) commits to icon and chevron inheriting `text` on the selected row. A frontmatter-only consumer will render muted icons on the selection fill (4.1:1). The `[ASSUMPTION]` at L164 still calls this "a recommendation", but L226 has already decided it. (DESIGN.md L100–103, L164, L226). *Fix:* add the token and remove or close the stale assumption.
- **low** The contrast table leaves out two pairs a consumer will meet: name text on the selected fill (computed 12.6 light / 9.4 dark) and the focus ring against the tree and selected backgrounds (4.9/6.7 and 4.1/4.6). The focus ring is listed only against `background`, but tree rows sit on `surface-tree`. (DESIGN.md L151–162). *Fix:* add both rows.

## 3. Component coverage — adequate

**What was checked:**
- 12 DESIGN components (`top-bar`, `button-primary`, `root-name`, `unsupported-message`, `tree`, `tree-row`, `tree-row-selected`, `status-row`, `unreadable-message`, `details-panel`, `details-row`, `focus-ring`) against 6 EXPERIENCE behavior rows (button, root name, arrow, item name, status row, details panel).

### Findings
- **high** No icon set or chevron glyph is specified. `tree-row` requires "an icon of a folder or file" and an arrow, and the ASCII uses emoji (📁 📄 ▸ ▾). Nothing says which glyphs are used or where they come from (inline SVG, Unicode, a library?), whether folders have open/closed variants, or how the chevron shows open vs. closed (glyph swap vs. rotation; animation is forbidden). Story-dev must invent a visible part of every row. (DESIGN.md L202, L225; EXPERIENCE.md L61). *Fix:* add an icon line to `tree-row` naming the source (e.g., inline SVG, stroke `currentColor`, `{spacing.icon}` box), the folder/file glyphs, and "chevron: ▸ closed / ▾ open, swap with no rotation".
- **medium** There is no 1:1 name bridge between the files. EXPERIENCE rows use Hebrew descriptive names; DESIGN uses kebab IDs. Several DESIGN components have no behavior row: `unsupported-message`, `unreadable-message` (it appears only in the state table), `tree` (scroll behavior), `details-row` and `focus-ring`. Two EXPERIENCE rows have no DESIGN component of their own: "arrow" and "item name" are only parts of `tree-row`. (EXPERIENCE.md L57–64; DESIGN.md L68–127). *Fix:* add the kebab ID in parentheses to each EXPERIENCE row and add the missing rows. Short is fine, e.g. `unreadable-message`: "inline after the name, not clickable, the name stays clickable and deselects".
- **medium** The details-panel empty state (`Select a file to see its details`) has no component or token entry. Its styling exists only as an `[ASSUMPTION]` (typography.status, italic). (DESIGN.md L179; EXPERIENCE.md L133). *Fix:* add `details-empty` to `components`, reusing the status-row tokens.
- **medium** The focus-ring target is inconsistent. DESIGN puts the ring "on tree rows" with a negative offset (L217, L230). EXPERIENCE recommends that the arrow and the name each be a separate `<button>` (L66), which would put the ring on each button, not the row. (DESIGN.md L230; EXPERIENCE.md L66). *Fix:* state which element shows the ring (e.g., "the name button; ring spans the row's full width") and which shape the arrow button's ring takes.
- **medium** The hit area of "item name" is undefined: just the text, or the rest of the row to the right of the chevron? This is the core interaction in FR-3, and the spines make the opposite choices plausible (Finder selects on a click anywhere in the row except the disclosure triangle). (EXPERIENCE.md L62). *Fix:* "Name hit area = from the icon to the row's end edge; the arrow hit area = the chevron slot only."

## 4. State coverage — adequate

**What was checked:**
- Top bar: unsupported, pre-root, root chosen, picker cancelled, root replaced, button focus.
- Tree: empty, root loading, folder loading, empty, unreadable folder, mid-enumeration failure, selected, unreadable file, scrolling.
- Details: empty, loading, file, folder, failed → empty, unknown `—` values, long-name wrapping.
- Dark mode.
- The 14-row state table (EXPERIENCE.md L70–85) is solid.

### Findings
- **medium** Closing a folder while it loads is missing. FR-3 says a second arrow click during `Loading…` closes the folder and the read continues in the background. The spines do not say what reopening shows (still `Loading…`, or the content once it has arrived). (EXPERIENCE.md L76). *Fix:* add a state row covering close-while-loading and reopen.
- **medium** Arrow behavior on a folder that failed to open is not specified. Does the chevron stay? Does clicking it toggle an empty open state, or do nothing? FR-3 caches the failure. (EXPERIENCE.md L78). *Fix:* add, e.g.: "the chevron stays, clicking it does nothing (or toggles with no children); the message stays next to the name".
- **medium** The root name in the top bar has no overflow or bidi rule. `dir="auto"` is specified only for names "in the tree and the panel" (DESIGN.md L240; EXPERIENCE.md L101), and the root name can be a long Hebrew folder name. (DESIGN.md L223). *Fix:* "root-name: `dir="auto"`, single line, ellipsis".
- **medium** The tree overflows in two places at a fixed 320px:
  - Deep nesting: at 20px per level, names vanish around depth 12.
  - A long name followed by `Unable to read this item` (about 150px of 12px italic text): the spines do not say which one truncates.

  (DESIGN.md L200–202, L228). *Fix:* state the priority (e.g., "the message never truncates; the name truncates first") and whether the tree scrolls horizontally at extreme depth or the indent keeps growing until the name disappears.
- **medium** Minimum window width and narrow-window behavior are left open (EXPERIENCE.md L135; DESIGN.md L206). This is honestly flagged, but the layout story needs it, and it is a one-line decision. *Fix:* commit to one (e.g., `min-width: 640px` on the app; the page scrolls horizontally below that).
- **low** The spines do not say what happens when the selected item's parent folder is collapsed. Per FR-3 the selection and details stay while the row is hidden. This can be derived but is not stated. (EXPERIENCE.md L70–85). *Fix:* add one state row.
- **low** The button has no pressed/active state. "No hover" is stated; the pressed appearance is left to the browser's UA style. (DESIGN.md L222). *Fix:* say "no active style beyond the UA default" or "none".
- **low** `—` in the state table means "no change / n/a", but `—` is also a real UI string for unknown values (EXPERIENCE.md L45). That is ambiguous to an AI consumer. (EXPERIENCE.md L76–85). *Fix:* use "no change" in the cells.

## 5. Visual reference coverage — adequate (pending)

**What was checked:**
- `mockups/` and `wireframes/` do not exist. They are expected to be rendered in Finalize, so this is pending, not a defect.
- `imports/` is empty.
- `.working/color-themes-1.html` is exploration only, not promoted and not linked from the spines.
- EXPERIENCE.md L29 has a spines-win statement plus a pointer to `mockups/`.

### Findings
- **medium** Two visual decisions currently depend on the pending mockup: the elevation interpretation and the italic empty state. Until the mockups exist, nothing checks the floating-card reading against the ASCII layout, which shows the panel attached to the tree. (DESIGN.md L212; EXPERIENCE.md L29, L132–133). *Fix:* when rendering the key-screen mockups in Finalize, resolve both assumptions, then remove the `[ASSUMPTION]` tags.
- **low** DESIGN.md has no spines-win statement and no mockup pointer; only EXPERIENCE.md does. The provenance of the contrast measurements (`color-themes-1.html`) is not cited either. (DESIGN.md L136–164). *Fix:* add a one-line pointer in Brand & Style or Colors.

## 6. Bloat & overspecification — strong

**What was checked:**
- Source restatement: the Voice table copies the PRD strings, which earns its place as the exact-string contract.
- The Bidi section resolves PRD §9's delegation to UX.
- No pixel specs that a token already covers, except where noted below.

### Findings
- **low** EXPERIENCE.md uses raw pixel values (320px L24/L109, 8px/12px L132) instead of `{spacing.tree-width}`, `{rounded.md}` and `{spacing.3}`. DESIGN's Typography table and Layout prose also repeat the values next to the tokens. This creates drift risk if a token changes. (EXPERIENCE.md L24, L109, L132; DESIGN.md L172–175, L200–204). *Fix:* use token references and drop the duplicated literal values.

## 7. Inheritance discipline — adequate

**What was checked:**
- Both files list the PRD and addendum as sources, and the paths resolve.
- PRD strings match exactly, including U+2026.
- The glossary terms used match PRD §3. "Top bar" (פס עליון) is a new UX term, and it is consistent across both files.
- Token references resolve.
- Every memlog decision was checked against the spines: direction B, the selection bar, unreadable = muted, no amber, 28/20 density, 320px fixed width, no hover, default cursor, system-ui at 13px, the label/value table, 8px radius plus shadow, the row anatomy, italic status rows, the top-left empty state, the 2px focus ring, `Open folder…`, no hint text, the FR-2 message in regular color, no tooltip, the climax, details loading, UJ-1 only, and the splitter deferred. All are reflected; none is contradicted or dropped.

### Findings
- **medium** The panel's position contradicts itself. Layout says the details panel "fills the remaining width and is attached to the tree" (DESIGN.md L201; matching the ASCII L190–196 and PRD "צמוד לעץ"). The elevation assumption makes it an inset card with a 12px margin and 8px corners (L212). The background color of the right-hand region behind the card is never defined. (DESIGN.md L201, L212). *Fix:* choose one. If it is a card, name the region's background token (e.g., `{colors.surface-tree}` or `{colors.background}`) and update the ASCII.
- **low** DESIGN's `[ASSUMPTION]` at L179 cites a decision for "gray text" for the empty state that has no memlog entry. The memlog records only "top-left aligned". (DESIGN.md L179; .memlog.md L32). *Fix:* cite it as an inference from the status-row decision, or log the decision.
- **low** DESIGN carries 4 `[ASSUMPTION]` tags (L164, L179, L206, L212), but EXPERIENCE's Open Items lists only 3 assumptions plus 1 open item. The contrast assumption (L164) is missing there and is already stale. (EXPERIENCE.md L130–135). *Fix:* make Open Items the single complete list, and close L164.

## 8. Shape fit — adequate

**What was checked:**
- DESIGN.md sections follow the canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts).
- All required EXPERIENCE.md sections are present: Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows.
- The invented sections each earn their place: Bidi (delegated to UX by the PRD), Out of scope, Open Items.
- The extra frontmatter keys (`title`, `status`, `sources`) are harmless.

### Findings
- **medium** There is no Responsive & Platform section, even though one is triggered. The platform constraint (Chrome desktop, `light-dark()` ≥ Chrome 123, `color-scheme`) and the open minimum-width question are scattered across DESIGN L138, L206 and EXPERIENCE L102 and L135. (EXPERIENCE.md). *Fix:* add a short Responsive & Platform section with the window-width decision and the platform floor.
- **low** There is no Inspiration & Anti-patterns section, even though the memlog records Finder as the behavioral reference and records rejections (amber, hover, emphasized-selection direction C). The content is spread across Do's/Don'ts and Interaction Primitives. (EXPERIENCE.md). *Fix:* add 3–4 lines: Finder behavior is adopted (arrow vs. name, no hover, default cursor); the OS look, amber warnings and a saturated selection fill are rejected.
- **low** EXPERIENCE.md has an H1 and DESIGN.md has none. This is cosmetic. *Fix:* optional.

## Mechanical notes

- **Token references found:**
  - colors: `background`, `surface-tree`, `border`, `text`, `text-muted`, `accent`, `accent-foreground`, `selected`
  - typography: `body`, `small`, `status`, `button`
  - rounded: `sm`, `md`
  - spacing: `1`–`6`, `tree-width`, `row-height`, `indent`, `icon`, `details-label-width`, `selection-bar`, `focus-ring`, `focus-ring-offset`

  All 29 resolve, with 0 unresolved.
- **Unused or referenced only in prose:** `{spacing.6}` appears only in the scale narrative. `typography.small` and `typography.status` have identical values; the duplication is semantic and acceptable.
- **Contrast check:** recomputed in light/dark. Text on tree 15.23/13.75, text on background 16.34/12.81, muted on tree 5.02/6.48, muted on background 5.38/6.03, muted on selected 4.14/4.44, accent-foreground on accent 5.27/7.22, accent on tree 4.92/6.72, accent on selected 4.06/4.60, accent on background 5.27/6.26, selected on tree 1.21/1.46. All match the table.
- **Palette:** identical to direction B in `.working/color-themes-1.html` (L35–40); the `warn` token was correctly removed.
- **Folders:** `mockups/` and `wireframes/` are absent (pending Finalize); `imports/` exists and is empty.
- **Severity tally:** critical 0, high 3, medium 14, low 12.

# Validation Report — file-browser-bmad

- **DESIGN.md:** `DESIGN.md`
- **EXPERIENCE.md:** `EXPERIENCE.md`
- **Run at:** 2026-10-22T19:51

## Overall verdict

Adequate. The spines can serve as the downstream contract once the high findings are resolved. There are no critical findings. Every token reference resolves, all contrast ratios were re-measured and match, UJ-1 and FR-1 through FR-8 are traceable, and every memlog decision is reflected.

The status column shows what was done after the review. All three high findings are fixed. Only one item is still open: whether the panel is attached to the tree or drawn as a card, which waits on the key-screen mock. This report is condensed. The full list of 29 findings is in review-rubric.md.

## Category verdicts
- Flow coverage — strong
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — adequate
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — adequate

## Findings by severity

### Critical (0)

### High (3)
**[Token completeness]** — Shadow cannot go through light-dark() and uses colors outside the palette (§ DESIGN.md components.details-panel)
Status: fixed
Fix: Make the shadow color a token and use one layer.

**[Token completeness]** — Border width, italic, inset focus offset, 12px inset and chevron slot have no tokens (§ DESIGN.md frontmatter)
Status: fixed
Fix: Add tokens.

**[Token completeness]** — No icon set or chevron glyph specified (§ DESIGN.md Components (tree-row))
Status: fixed
Fix: Own inline SVG with thin stroke, one folder icon, chevron right/down (Ita).


### Medium (14)
**[Component coverage]** — Selected row's icon color is not in the frontmatter, and an [ASSUMPTION] about it is stale (§ DESIGN.md tree-row-selected)
Status: fixed
Fix: Add icon-color and chevron-color.

**[Component coverage]** — Selection indicator is written as prose, not a CSS value (§ DESIGN.md tree-row-selected)
Status: fixed
Fix: Split it into width and color tokens.

**[Component coverage]** — Component names in the two files do not match one to one (§ both)
Status: fixed
Fix: Use the DESIGN component IDs in EXPERIENCE.

**[Component coverage]** — Details empty state has no component (§ DESIGN.md components)
Status: fixed
Fix: Add details-empty.

**[Component coverage]** — Unclear which element shows the focus ring (§ DESIGN.md focus-ring / EXPERIENCE note)
Status: fixed
Fix: It shows on the focused button, inset inside the tree.

**[State coverage]** — Name hit area undefined (§ EXPERIENCE.md tree-name)
Status: fixed
Fix: Whole row from the icon to the end edge (Ita).

**[State coverage]** — Close while loading, then reopen, is not specified (§ EXPERIENCE.md State Patterns)
Status: fixed
Fix: Add the state, derived from FR-3.

**[State coverage]** — Chevron on a folder that failed to open is not specified (§ EXPERIENCE.md State Patterns)
Status: fixed
Fix: The chevron disappears and its slot stays empty (Ita).

**[State coverage]** — Root name has no overflow or bidi rule (§ DESIGN.md root-name)
Status: fixed
Fix: dir=auto plus ellipsis.

**[State coverage]** — Deep nesting and a long name next to the unreadable message overflow the fixed tree width (§ DESIGN.md Layout)
Status: fixed
Fix: The message stays whole and the name truncates. Deep nesting keeps truncating, with no horizontal scroll (Ita).

**[State coverage]** — Minimum window width is open (§ EXPERIENCE.md)
Status: fixed
Fix: 640px minimum, then horizontal scroll (Ita).

**[Visual reference coverage]** — Elevation and empty-state italic depend on the mockup (§ DESIGN.md Elevation)
Status: pending mock
Fix: Italic was decided (not italic). Elevation is resolved in the key-screen mock.

**[Inheritance discipline]** — Details panel is both 'attached to the tree' and 'an inset card' (§ DESIGN.md Layout vs Elevation)
Status: pending mock
Fix: Decide in the key-screen mock.

**[Shape fit]** — No Responsive & Platform section (§ EXPERIENCE.md)
Status: fixed
Fix: Add one.


### Low (11)
**[Flow coverage]** — Flow labelled as 'copied from PRD' although it adds UX content (§ EXPERIENCE.md Key Flows)
Status: fixed
Fix: Relabel as 'based on PRD §2.2'.

**[Flow coverage]** — No rule for how hidden items (.git) look (§ EXPERIENCE.md Component Patterns)
Status: fixed
Fix: Not dimmed (approved by Ita).

**[Token completeness]** — Contrast table missing text-on-selected and focus ring on tree/selected (§ DESIGN.md Colors)
Status: fixed
Fix: Add rows.

**[State coverage]** — Selected item inside a collapsed parent is not covered (§ EXPERIENCE.md State Patterns)
Status: fixed
Fix: Add a state row.

**[State coverage]** — Button has no pressed state (§ DESIGN.md button-primary)
Status: fixed
Fix: Use the browser default (approved by Ita).

**[State coverage]** — The '—' in the state table is ambiguous because '—' is also a UI string (§ EXPERIENCE.md State Patterns)
Status: fixed
Fix: Write 'no change' instead.

**[Visual reference coverage]** — DESIGN.md does not point to the mockups or the color-themes page (§ DESIGN.md Brand & Style)
Status: fixed
Fix: Add a pointer.

**[Bloat & overspecification]** — Raw px values repeated next to their tokens (§ both)
Status: fixed
Fix: Use the token references instead.

**[Inheritance discipline]** — An [ASSUMPTION] cited a decision that was never logged (§ DESIGN.md Typography)
Status: fixed
Fix: Rewritten from the logged decision.

**[Inheritance discipline]** — Open Items list was incomplete (§ EXPERIENCE.md Open Items)
Status: fixed
Fix: Make it a single complete list.

**[Shape fit]** — No Inspiration & Anti-patterns section (§ EXPERIENCE.md)
Status: fixed
Fix: Add one.

## Reviewer files
- `review-rubric.md`

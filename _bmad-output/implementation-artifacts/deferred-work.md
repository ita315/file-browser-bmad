# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-setup-and-root-folder-selection.md`
  summary: harness אוטומטי לחוקי האכיפה — קבצי fixture שמפרים כל חוק של oxlint/stylelint ומוודאים ש-`npm run check` נכשל עליהם.
  evidence: כרגע AC-2 נבדק ידנית פעם אחת (23 הפרות); טעות ב-glob של override או חוק שנמחק לא ייתפסו אוטומטית.

- source_spec: `_bmad-output/implementation-artifacts/spec-mcp-tokens.md`
  summary: הנתיב `mcp_servers/design-tokens/server.ts` ב-`args` של `.mcp.json` יחסי, כך שאם Claude Code מפעיל את השרת מתת-תיקייה, ‏node לא ימצא את הסקריפט (maybe-false, אם נכון: medium).
  evidence: ‏`TOKENS_FILE` נפתר מול שורש הפרויקט, אבל נתיב הסקריפט נפתר מול ה-cwd. כדי להכריע: מפעילים `claude` מ-`src/` ובודקים ש-`/mcp` מראה את `design-tokens` במצב Connected.

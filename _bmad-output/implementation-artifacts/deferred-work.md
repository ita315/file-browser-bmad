# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-setup-and-root-folder-selection.md`
  summary: harness אוטומטי לחוקי האכיפה — קבצי fixture שמפרים כל חוק של oxlint/stylelint ומוודאים ש-`npm run check` נכשל עליהם.
  evidence: כרגע AC-2 נבדק ידנית פעם אחת (23 הפרות); טעות ב-glob של override או חוק שנמחק לא ייתפסו אוטומטית.

- source_spec: `_bmad-output/implementation-artifacts/spec-mcp-tokens.md`
  summary: הנתיב `mcp_servers/design-tokens/server.ts` ב-`args` של `.mcp.json` יחסי, כך שאם Claude Code מפעיל את השרת מתת-תיקייה, ‏node לא ימצא את הסקריפט (maybe-false, אם נכון: medium).
  evidence: ‏`TOKENS_FILE` נפתר מול שורש הפרויקט, אבל נתיב הסקריפט נפתר מול ה-cwd. כדי להכריע: מפעילים `claude` מ-`src/` ובודקים ש-`/mcp` מראה את `design-tokens` במצב Connected.

- source_spec: `_bmad-output/implementation-artifacts/spec-mcp-tokens-get-token-description.md`
  summary: ה-description של `get_token` לא אומר איך מוצאים את שם הטוקן (למשל `tokens://all` או ה-`var(--…)` ב-`app.css`), ולכן המודל עלול עדיין לקרוא את `tokens.css` כדי למצוא שמות (maybe-false, אם נכון: medium).
  evidence: ‏`get_token` מקבל רק שם מדויק. כדי להכריע: להריץ שוב את בדיקה ידנית 3 עם שאלה שלא מופיעה ב-description, ולבדוק אם Claude קורא את `tokens.css` לפני הקריאה ל-`get_token`.

- source_spec: `_bmad-output/implementation-artifacts/spec-mcp-tokens-get-token-description.md`
  summary: ‏`.memlog.md` של spec-mcp-tokens (שורה 30) עדיין רושם את הטריגר הישן "לפני שכותבים ערך עיצובי ב-CSS", וצריך להוסיף שורת `(decision)` שמחליפה אותו.
  evidence: ‏bmad-spec בונה מחדש מה-memlog, כך שעדכון הבא של ה-spec עלול להחזיר את הנוסח הישן.

- source_spec: אין (תקלה ב-`main` אחרי מיזוג PR #1 ו-PR #2, תוקנה ב-`090cae2`)
  summary: ‏GitHub Action שמריץ `npm run check` על כל PR, יחד עם branch protection על `main` עם "Require branches to be up to date before merging", כדי שהבדיקה תרוץ על הקוד המשולב לפני המיזוג.
  evidence: ה-pre-commit hook רץ רק על commits מקומיים. ‏PR #1 (image-preview) ו-PR #2 (design-tokens) היו ירוקים כל אחד לבד, אבל ה-merge commit ‏`35203cb` שנוצר ב-GitHub לא נבדק, ו-`main` נשאר אדום (3 מתוך 229 טסטים): ‏#1 הוסיף שני טוקנים, והטסטים של #2 קבעו 46.

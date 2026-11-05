# file-browser-bmad

## אסור
- לשנות את `_bmad-output/` ביד, רק דרך הסוכנים של BMAD. המסמכים מתעדים החלטות, ושינוי ידני שובר את הקשר ביניהם.

## מוסכמות
- שיחה ומסמכים בעברית, ממשק האפליקציה באנגלית.
- commit אחרי כל תרגיל.

## פקודות
- `npm run check`: מריץ `tsc -b`, ‏`oxlint --deny-warnings`, ‏stylelint על `src/**/*.css` ו-`vitest run`.
- ה-hook ‏`.githooks/pre-commit` מריץ את `npm run check` בכל commit. הסקריפט `prepare` מגדיר את `core.hooksPath` בזמן `npm install`.

## הפניות
- כללי עבודה: `.claude/rules/`
- החלטות ארכיטקטורה (AD-1 עד AD-11): `_bmad-output/planning-artifacts/architecture/architecture-file-browser-bmad-2026-10-22/ARCHITECTURE-SPINE.md`
- בדיקת הקוד מול הכללים והארכיטקטורה: `.claude/skills/rules-audit/`

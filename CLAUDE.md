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

## הסולם

| כלי | שלב | למה לא שלב נמוך יותר |
|---|---|---|
| `CLAUDE.md` ו-`.claude/rules/` | rule | זה הבסיס: נטען תמיד, ואין שלב נמוך ממנו |
| `/explain-he` | command | נקרא ביד כשצריך הסבר, ולא כלל שצריך להיטען בכל שיחה |
| `rules-audit` | skill | יש לו שלבי עבודה ותיאור שמפעיל אותו לפי ההקשר, ופקודה רק נקראת ביד |
| `review-change` עם הסוכן `rules-reviewer` | skill, fork | רץ בחלון נפרד וקורא בלבד, כדי שהבדיקה לא תזהם את השיחה ולא תשנה קוד |
| `bmad-*` | skill | מגיעים מ-BMAD, לא נכתבים כאן |
| `file-viewer@ita-plugins` | mod, מחוץ לסולם | מצייר ממשק, ומגיע דרך החנות |
| MCP | אין | הקבצים בפרויקט ו-AD-9 נאכף ב-stylelint. MCP מוצדק רק למקור נתונים חיצוני. הקוד ב-`mcp_servers/design-tokens` נשאר כדוגמה ללימוד |
| `rules-review-kit` | plugin | מפורסם בחנות לפרויקטים אחרים. לא מופעל כאן, כי הגרסאות המקומיות כבר קיימות |

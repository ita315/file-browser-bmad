---
id: SPEC-mcp-tokens
companions:
  - stack.md
  - ../../planning-artifacts/architecture/architecture-file-browser-bmad-2026-10-22/ARCHITECTURE-SPINE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# שרת MCP ‏design-tokens

## Why

תרגיל 1 ברמה 5 של הקורס: לבנות שרת MCP ראשון, קטן, שמראה את שלושת הסוגים של MCP (tool, ‏resource, ‏prompt) על נתונים אמיתיים מהפרויקט. הנושא הוא ה-design tokens ב-`src/ui/tokens.css`, כי AD-9 קובע שכל ערך עיצובי יגיע מהקובץ הזה, ומודל שכותב CSS צריך לדעת איזה טוקן מתאים. המטרה הלימודית העיקרית היא להבין את ההבדל בין קלט ש-schema דוחה לבין שגיאה שה-handler מחזיר.

## Capabilities

- **CAP-1**
  - **intent:** המודל מחליט בעצמו לבקש ערך של טוקן לפי השם שלו, למשל `--color-accent`.
  - **success:** ‏`get_token({ name: "--color-accent" })` מחזיר `#3B6EA8`. ‏`name: "color-accent"` נדחה ב-schema, וה-handler לא רץ. ‏`name: "--color-nope"` עובר את ה-schema ומחזיר `isError: true` עם הודעת "לא נמצא".
- **CAP-2**
  - **intent:** ‏Ita מצרפת לשיחה עם `@` את רשימת כל הטוקנים, בצורה מובנית.
  - **success:** ה-resource מחזיר `application/json` עם 46 רשומות `{ name, value, category }`, ו-`category` הוא אחד מ-`color`, ‏`typography`, ‏`rounded` או `spacing`.
- **CAP-3**
  - **intent:** ‏Ita מפעילה פקודת לוכסן שמנחה את המודל להחליף ערכים ממשיים בקובץ CSS ב-`var(--…)`.
  - **success:** ‏`/mcp__design-tokens__style-with-tokens` עם `file: "src/ui/app.css"` מחזיר הנחיה שכוללת את שם הקובץ ואת רשימת הטוקנים. ‏`file: "README.md"` נדחה ב-schema.
- **CAP-4**
  - **intent:** השרת רשום לפרויקט ומשותף ב-git, עם הגדרה אחת שאפשר לשנות בלי לערוך קוד.
  - **success:** ‏`/mcp` מראה את `design-tokens` במצב Connected. ‏`claude mcp get design-tokens` מראה scope project. ‏`TOKENS_FILE=/nope` מחזיר `isError: true` מה-tool, והשרת נשאר Connected.

## Constraints

- **קריאה בלבד:** השרת לא כותב לשום קובץ ולא מריץ פקודות. גם ה-prompt רק מחזיר טקסט.
- **stdio:** ‏stdout שמור לפרוטוקול, וכל לוג נכתב ל-stderr בלבד.
- **בדיוק אחד מכל סוג:** tool אחד, ‏resource אחד, ‏prompt אחד.
- **בלי שלב build:** השרת רץ עם `node --experimental-strip-types`. לכן מותר רק תחביר TypeScript שאפשר פשוט למחוק (בלי `enum`, ‏`namespace` ו-parameter properties), וכל ייבוא מקומי כולל סיומת `.ts`.
- **הגדרה מהסביבה:** ההגדרה היחידה היא `TOKENS_FILE`, עם ברירת מחדל `src/ui/tokens.css`. אין סודות ב-`.mcp.json`.
- **description של `get_token`:** כותב במפורש מתי להשתמש ב-tool: בכל פעם שצריך לדעת את הערך של טוקן, למשל כשעונים על שאלה כמו "כמה מעוגלות הפינות של כפתור". הוא גם אומר שעדיף להשתמש בו ולא לקרוא את `tokens.css` ישירות. בלי זה המודל לא יבחר ב-tool מעצמו.
- **קריאה מחדש:** הקובץ נקרא מחדש בכל קריאה ל-tool, ל-resource או ל-prompt, ואין cache. כשהקובץ חסר, או כשהשם לא קיים, חוזרת תוצאה עם `isError: true`, והשרת לא קורס.
- **`npm run check` ירוק בכל commit:** הבדיקה כוללת tsc, ‏oxlint ו-vitest על קוד השרת (כלל `check-green-every-commit`).

## Non-goals

- כתיבה או עריכה של קבצים, כולל החלפה אוטומטית של ערכים ב-CSS.
- ‏`find_token` לפי ערך (נדחה לתרגיל הבא).
- ערכי dark mode ו-`light-dark()`.
- כל transport מלבד stdio.
- פרסור CSS מלא: נקראות רק הצהרות `--name: value;` בתוך `:root`.
- החלטות הארכיטקטורה והכללים ב-`.claude/rules/` כנושא לשרת.

## Success signal

ב-Claude Code, בתיקיית הפרויקט:
- ‏`/mcp` מראה את `design-tokens` במצב Connected.
- ‏`claude mcp get design-tokens` מראה scope project.
- טסט vitest מוכיח ש-`get_token` דוחה את `"color-accent"` ב-schema ומחזיר "לא נמצא" ל-`"--color-nope"`.
- בסשן אחד משתמשים בשלושת החלקים:
  - Claude קורא ל-`get_token` בעצמו, בלי שהבקשה מזכירה את ה-tool או את השרת.
  - ‏Ita מצרפת את `tokens://all` עם `@`.
  - ‏Ita מפעילה את `/mcp__design-tokens__style-with-tokens` עם קובץ CSS תקין, ומקבלת את ההנחיה.

## Assumptions

- נתיב יחסי ב-`TOKENS_FILE` נפתר מול שורש הפרויקט, מתוך הנחה ש-Claude Code מפעיל שרת project מתיקיית הפרויקט. צריך לאמת במימוש. אם ההנחה לא נכונה, פותרים את הנתיב מול המיקום של קובץ השרת.
- ‏`@modelcontextprotocol/sdk@^1.32.2` מקבל schemas של `zod@^4.6.7` ב-`registerTool` וב-`registerPrompt`. צריך לאמת בהתקנה.

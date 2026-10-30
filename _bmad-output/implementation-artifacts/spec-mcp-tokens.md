---
title: 'שרת MCP design-tokens (רמה 5, תרגיל 1)'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: '74211f6bba6a41f93f111729927e0774092decdf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-mcp-tokens/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-mcp-tokens/stack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** מודל שכותב CSS בפרויקט לא יודע איזה טוקן מ-`src/ui/tokens.css` מתאים, ו-AD-9 דורש שכל ערך עיצובי יגיע משם. אין שרת MCP שחושף את הטוקנים.

**Approach:** שרת MCP ב-stdio, ‏Node עם `--experimental-strip-types` בלי build, עם tool ‏`get_token`, ‏resource ‏`tokens://all` ו-prompt ‏`style-with-tokens`, לפי החוזה ב-SPEC.md וב-stack.md. נרשם ב-`.mcp.json` ברמת project.

## Boundaries & Constraints

**Always:** קריאה בלבד. ‏stdout רק לפרוטוקול, לוגים ל-stderr. הקובץ נקרא מחדש בכל קריאה, בלי cache. ‏`TOKENS_FILE` עם ברירת מחדל `src/ui/tokens.css`; נתיב יחסי נפתר מול שורש הפרויקט שמחושב ממיקום `server.ts` (‏`../../`), ולא מול ה-cwd. רק TypeScript שאפשר למחוק, וייבוא מקומי עם `.ts`. ה-description של `get_token` אומר מתי להשתמש בו (לפני כתיבת ערך עיצובי ב-CSS), שהוא עדיף על קריאת `tokens.css`, ונותן דוגמאות `--color-accent` ו-`--spacing-2`. ‏`npm run check` ירוק.

**Never:** כתיבת קבצים או הרצת פקודות, ‏`find_token`, ‏dark mode, ‏transport אחר, פרסור CSS מלא (רק `--name: value;` בתוך `:root`), יותר מ-tool/resource/prompt אחד.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| טוקן קיים | ‏`get_token({ name: "--color-accent" })` | טקסט `#3B6EA8` | — |
| שם לא חוקי | ‏`name: "color-accent"` | ה-SDK מחזיר `isError: true` עם `Input validation error`; ה-handler לא נקרא | schema (zod) |
| שם לא קיים | ‏`name: "--color-nope"` | ‏`isError: true` עם הודעת "not found" שכוללת את השם | handler |
| קובץ חסר | ‏`TOKENS_FILE=/nope`, ‏`get_token` | ‏`isError: true` עם הנתיב; השרת ממשיך לענות | handler תופס |
| resource | ‏`tokens://all` | ‏`application/json`, 46 רשומות `{ name, value, category }`, ‏category ∈ color/typography/rounded/spacing | קובץ חסר → שגיאת פרוטוקול, השרת לא קורס |
| prompt תקין | ‏`file: "src/ui/app.css"` | הודעת user אחת עם שם הקובץ, הנחיית AD-9 ורשימת הטוקנים | — |
| prompt לא חוקי | ‏`file: "README.md"` | נדחה ב-schema (שגיאת פרוטוקול) | schema |

</frozen-after-approval>

## Code Map

- `src/ui/tokens.css` -- המקור: 46 הצהרות ב-`:root` (8 color, ‏17 typography, ‏2 rounded, ‏19 spacing). לא לשנות.
- `node_modules/@modelcontextprotocol/sdk` 1.32.2 -- ‏`McpServer.registerTool/registerResource/registerPrompt`, ‏`StdioServerTransport`, ‏`InMemoryTransport` (‏`sdk/inMemory.js`) ו-`Client` לטסטים. ב-`dist/esm/server/mcp.js`: כישלון schema של tool מוחזר כ-`isError: true` עם `Input validation error: ...`, לא כשגיאת פרוטוקול. כישלון schema של prompt נזרק כ-`McpError` ‏InvalidParams.
- `zod` 4.6.7 -- raw shapes ל-`inputSchema` ול-`argsSchema`.
- `tsconfig.json` -- להוסיף reference ל-`tsconfig.mcp.json`. ‏`tsconfig.node.json` הוא הדפוס להעתיק (‏`module: nodenext`, ‏`types: ["node"]`).
- `vite.config.ts` -- vitest עם `environment: 'jsdom'` כברירת מחדל; טסטי השרת מבקשים `// @vitest-environment node`. ה-include הדיפולטי כבר תופס את `mcp_servers/**`.
- `.oxlintrc.json` -- רץ על כל הריפו; אין צורך בשינוי.

## Tasks & Acceptance

**Execution:**
- [x] `tsconfig.mcp.json`, `tsconfig.json` -- ‏`include: ["mcp_servers"]`, ‏nodenext, ‏`erasableSyntaxOnly`, ‏`allowImportingTsExtensions`, ‏`verbatimModuleSyntax`, ‏`noEmit`; להוסיף ל-references -- ‏`tsc -b` בודק את השרת
- [x] `mcp_servers/design-tokens/tokens.ts` -- ‏`parseTokens(css)`, ‏`findToken`, ‏`TOKEN_NAME` ו-`CSS_FILE` (regex) -- לוגיקה טהורה שנבדקת בלי פרוטוקול
- [x] `mcp_servers/design-tokens/server.ts` -- ‏`createServer(loadCss)` רושם את שלושת החלקים; ‏`resolveTokensFile()`; חיבור stdio רק תחת `import.meta.main` -- טסט יכול לייבא בלי להפעיל stdio, ולהזריק `loadCss` כדי לספור קריאות
- [x] `mcp_servers/design-tokens/tokens.test.ts` -- פרסור: 46 רשומות, קטגוריות, ‏`--color-accent` -- AC-1
- [x] `mcp_servers/design-tokens/server.test.ts` -- דרך `Client` + ‏`InMemoryTransport`: כל שורות המטריצה, כולל ש-`loadCss` לא נקרא בדחיית schema -- AC-2
- [x] `.mcp.json` -- לפי stack.md -- רישום project

**Acceptance Criteria:**
- Given ‏`tokens.css` האמיתי, when ‏`parseTokens`, then 46 רשומות ו-`--color-accent` = ‏`#3B6EA8`.
- Given ‏client מחובר, when ‏`get_token("color-accent")`, then ‏`isError` עם `Input validation error` ו-`loadCss` נקרא 0 פעמים; when ‏`"--color-nope"`, then ‏`isError` עם "not found" ו-`loadCss` נקרא פעם אחת.
- Given ‏`loadCss` שזורק, when קוראים ל-tool ואחריו ל-`listTools`, then ‏`isError` ואז תשובה תקינה.
- Given ‏`.mcp.json`, when ‏Ita מריצה `/mcp` ו-`claude mcp get design-tokens`, then ‏Connected ו-Scope: Project.

## Implementation Notes

- `npm run check` ירוק: 8 קבצי טסט, 155 טסטים (21 חדשים: 7 ב-`tokens.test.ts`, ‏14 ב-`server.test.ts`). ‏`tsc -p tsconfig.mcp.json --listFilesOnly` מאשר שארבעת קבצי `mcp_servers` נבדקים.
- `tsconfig.mcp.json` מוסיף `strict: true`, שאין בשאר ה-tsconfigs של הריפו.
- `parseTokens` מדלג על הצהרות `--x` שהמקטע הראשון שלהן אינו אחת מארבע הקטגוריות (כך `category` תמיד חוקי). ב-`tokens.css` הנוכחי זה לא משנה כלום: 46 מתוך 46 נקראים. ‏`color-scheme: light` לא נקרא כי הוא לא `--`.
- הנתיב היחסי נפתר מול `../../` של `server.ts` (לא מול ה-cwd), כך שההנחה ב-SPEC על ה-cwd של Claude Code לא נדרשת. נבדק ב-smoke test דרך `StdioClientTransport` עם `cwd: '/'`: ‏`get_token("--color-accent")` החזיר `#3B6EA8`, ועם `TOKENS_FILE=/nope` חזר `isError` עם הנתיב, ו-`listTools` ענה אחרי זה.
- ההנחה על zod 4 ב-SDK 1.32.2 אומתה: ‏`registerTool` ו-`registerPrompt` מקבלים raw shapes של zod 4, ודחיית ה-schema מתנהגת כמו ב-Code Map (tool: ‏`isError` עם `Input validation error`; ‏prompt: שגיאת פרוטוקול `Invalid arguments`).
- Verification: ‏`TOKENS_FILE=/nope node --experimental-strip-types mcp_servers/design-tokens/server.ts < /dev/null` → ‏stdout ריק (0 bytes), ‏stderr: `design-tokens: serving /nope over stdio`, יציאה 0.
- תיקונים אחרי review: טסט no-cache עם קובץ זמני אמיתי ו-`loadTokensFile`; טסט לנקודת הכניסה דרך `StdioClientTransport` מ-`cwd: '/'`; ה-prompt אומר לא לשנות את `src/ui/tokens.css` עצמו ולבחור טוקן לפי הקטגוריה והמשמעות של המאפיין ולא רק לפי ערך; הודעת "not found" בלי שם קובץ; ‏`findToken` מחזיר את ההצהרה האחרונה (cascade). ‏`mcp_servers`: ‏24 טסטים ירוקים.
- לא נבדק: AC-4 והאימות הידני (צעדים 1 עד 6 ב-stack.md) נשארים ל-Ita ב-Claude Code.

## Spec Change Log

## Review Triage Log

סבב 1 (‏E = edge-case,‏ B = blind,‏ V = verification-gap).

| # | ממצא | Verdict | ראיה | ניתוב |
|---|------|---------|------|-------|
| V1 | "בלי cache" נבדק רק על spy, לא על `loadTokensFile` | medium | gap מאומת: memo ב-`loadTokensFile` ישאיר את כל 21 הטסטים ירוקים | patch |
| V2 | בלוק `import.meta.main` ו-stdio לא נבדקים אוטומטית | medium | gap מאומת: `console.log` בלוג ההפעלה ישבור את הפרוטוקול וכל הטסטים יעברו | patch |
| E7+B6 | ה-prompt מקבל את `src/ui/tokens.css` עצמו | low | ‏`CSS_FILE` תופס אותו, וההנחיה תגרום ל-`--x: var(--x)` מעגלי | patch (משפט בטקסט ההנחיה; ה-regex הוא החוזה ב-stack.md) |
| B7 | אין כלל לערכים כפולים (8px = ‏`--spacing-2` וגם `--rounded-md`) | low | נכון ב-`tokens.css`; ההנחיה אומרת רק "matching token" | patch (משפט בהנחיה) |
| B5 | הודעת "not found" כוללת את `tokens.css` גם כש-`TOKENS_FILE` אחר | low | ‏`server.ts`, הטקסט קבוע | patch (הודעה בלי שם קובץ) |
| E1 | שם כפול: `findToken` מחזיר את הראשון, וה-cascade לוקח את האחרון | low | אין כפולים היום (נבדק), אבל התיקון ישיר | patch (`findLast`) |
| B1 | הנתיב ב-`args` של `.mcp.json` יחסי ל-cwd | maybe-false | ‏`TOKENS_FILE` נפתר בלי תלות ב-cwd, אבל הסקריפט עצמו לא; יוכרע אם `/mcp` מראה Connected כש-`claude` מופעל מתת-תיקייה | defer |
| E3+B4 | טוקן עם קטגוריה לא מוכרת נעלם, ו-"not found" מטעה | low | אמיתי רק כשמוסיפים קטגוריה ל-`DESIGN.md`; התיקון מוסיף ענף | reject |
| E2 | ‏`:root` בתוך `@media` | low | ‏dark mode הוא Non-goal במפורש | reject (מחוץ ל-intent) |
| E4 | שמות עם אותיות גדולות | false | ‏`TOKEN_NAME` ב-schema דוחה אותם בכל מקרה, ו-`tokens.css` באותיות קטנות | reject |
| E5 | ‏`;` או `}` בתוך מחרוזת | low | Non-goal: "פרסור CSS מלא" | reject (מחוץ ל-intent) |
| B3+V-other | הצהרה אחרונה בלי `;` | low | Non-goal: רק `--name: value;` | reject (מחוץ ל-intent) |
| E6 | ‏`src/../../x.css` עובר את `CSS_FILE` | low | ‏Ita מקלידה את הארגומנט בעצמה; השרת לא כותב; ה-regex הוא החוזה | reject |
| B2 | ברירת המחדל בשני מקומות; ‏`TOKENS_FILE` מה-shell | low | שני המקומות נדרשים בחוזה (SPEC ו-stack.md); ‏`.mcp.json` תמיד גובר | reject |
| B8 | אין למודל דרך לגלות שמות | low | גילוי לפי ערך (`find_token`) נדחה במפורש לתרגיל הבא | reject (מחוץ ל-intent) |
| B9 | לוג ל-stderr רק ב-tool; אין טסט ל-prompt כשהקובץ חסר | low | השגיאה מגיעה ל-client בכל מקרה; אין נזק מוגדר | reject |
| B10 | ‏46 ומספרים לכל קטגוריה קשורים לקובץ האמיתי | low | ‏46 הוא קריטריון ההצלחה ב-SPEC; טוקן חדש = עדכון שורה אחת בטסט | reject |
| B11 | ‏`--experimental-strip-types` מיותר ב-Node 24 | false | ה-SPEC דורש את הדגל במפורש; ‏stdout לא מושפע | reject |
| B12 | ‏`strict: true` בלי נימוק | false | מתועד ב-Implementation Notes; אין נזק מוגדר | reject |

## Design Notes

שני סוגי "שגיאה" נראים למודל דומה (`isError: true`), אבל נולדים במקומות שונים: דחיית schema קורית ב-SDK לפני ה-handler, ו"לא נמצא" קורה בתוך ה-handler. הטסט מבדיל ביניהם בעזרת `loadCss` מוזרק:

```ts
const loadCss = vi.fn(async () => css)
await client.callTool({ name: 'get_token', arguments: { name: 'color-accent' } })
expect(loadCss).not.toHaveBeenCalled()   // ה-handler לא רץ
```

## Verification

**Commands:**
- `npm run check` -- expected: ירוק, כולל הטסטים החדשים
- `TOKENS_FILE=/nope node --experimental-strip-types mcp_servers/design-tokens/server.ts < /dev/null` -- expected: לוג ב-stderr בלבד, stdout ריק

**Manual checks (Ita, ב-Claude Code):**
- צעדים 1 עד 6 ב-"אימות ידני" של stack.md.

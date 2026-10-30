# Stack: שרת design-tokens

## תלויות
- `@modelcontextprotocol/sdk@^1.32.2` (‏`McpServer`, ‏`StdioServerTransport`)
- `zod@^4.6.7` ל-input schemas של ה-tool ושל ה-prompt
- Node עם `--experimental-strip-types`, בלי build

## קבצים
| קובץ | תפקיד |
|---|---|
| `mcp_servers/design-tokens/tokens.ts` | פונקציות טהורות: מפרסרות `--name: value;` מתוך `:root` ל-`{ name, value, category }[]`, ומייצאות את ה-regex של השם ושל הקובץ |
| `mcp_servers/design-tokens/server.ts` | נקודת הכניסה: קורא את `TOKENS_FILE` ורושם את ה-tool, ה-resource וה-prompt |
| `mcp_servers/design-tokens/tokens.test.ts` | ‏vitest: פרסור (46 רשומות), schema של `name` ושל `file`, ו"לא נמצא" |
| `tsconfig.mcp.json` | ‏`include: ["mcp_servers"]`, ‏`erasableSyntaxOnly`, ‏`allowImportingTsExtensions`, ‏`noEmit`. מתווסף ל-references ב-`tsconfig.json` |

## חוזה MCP
| סוג | שם / URI | קלט (zod) | פלט |
|---|---|---|---|
| tool | `get_token` | `name: z.string().regex(/^--[a-z0-9-]+$/)`. ה-description אומר: "השתמש בכל פעם שצריך לדעת את הערך של טוקן, למשל כשעונים על 'כמה מעוגלות הפינות של כפתור', ועדיף על קריאה ישירה של tokens.css". יש בו גם דוגמאות: `--color-accent`, ‏`--spacing-2` | הערך כטקסט, או `isError: true` |
| resource | `tokens://all` | אין | ‏`application/json`: ‏`[{ name, value, category }]` |
| prompt | `style-with-tokens` | `file: z.string().regex(/^src\/.+\.css$/)`. ארגומנטים של prompt הם תמיד מחרוזות | הודעת user עם הנחיית AD-9 ורשימת הטוקנים |

‏`category` הוא המקטע הראשון בשם: `color`, ‏`typography`, ‏`rounded` או `spacing`.

## `.mcp.json`
```json
{
  "mcpServers": {
    "design-tokens": {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "mcp_servers/design-tokens/server.ts"],
      "env": { "TOKENS_FILE": "${TOKENS_FILE:-src/ui/tokens.css}" }
    }
  }
}
```

## אימות ידני
1. ‏`/mcp` → ‏`design-tokens` במצב Connected.
2. ‏`claude mcp get design-tokens` → ‏Scope: Project.
צעדים 3 עד 5 רצים באותו סשן:

3. **tool מעצמו:** נותנים משימה שלא מזכירה את ה-tool, את השרת או את `tokens.css`. למשל: "באיזה צבע מודגשת שורה נבחרת בעץ?". בתמליל צריך להופיע קריאה ל-`mcp__design-tokens__get_token`.
4. **resource עם `@`:** ‏`@design-tokens:tokens://all` מצרף את רשימת ה-JSON.
5. **prompt בלוכסן:** מריצים `/mcp__design-tokens__style-with-tokens` עם `src/ui/app.css`, ובודקים שחוזרת הנחיה עם רשימת הטוקנים.
6. **דחייה ב-schema:** מריצים את אותו prompt עם `README.md`, ובודקים שהוא נדחה.

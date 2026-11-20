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


| כלי                                       | שלב             | למה לא שלב נמוך יותר                                                                                                            |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` ו-`.claude/rules/`            | rule            | זה הבסיס: נטען תמיד, ואין שלב נמוך ממנו                                                                                         |
| `/explain-he`                             | command         | נקרא ביד כשצריך הסבר, ולא כלל שצריך להיטען בכל שיחה                                                                             |
| `rules-audit`                             | skill           | יש לו שלבי עבודה ותיאור שמפעיל אותו לפי ההקשר, ופקודה רק נקראת ביד                                                              |
| `review-change` עם הסוכן `rules-reviewer` | skill, fork     | רץ בחלון נפרד וקורא בלבד, כדי שהבדיקה לא תזהם את השיחה ולא תשנה קוד                                                             |
| `bmad-*`                                  | skill           | מגיעים מ-BMAD, לא נכתבים כאן                                                                                                    |
| `file-viewer@ita-plugins`                 | mod, מחוץ לסולם | מצייר ממשק, ומגיע דרך החנות                                                                                                     |
| MCP                                       | אין             | הקבצים בפרויקט ו-AD-9 נאכף ב-stylelint. MCP מוצדק רק למקור נתונים חיצוני. הקוד ב-`mcp_servers/design-tokens` נשאר כדוגמה ללימוד |
| `rules-review-kit`                        | plugin          | מפורסם בחנות לפרויקטים אחרים. לא מופעל כאן, כי הגרסאות המקומיות כבר קיימות                                                      |




## עבודה ללא השגחה (Level 7)



### סשן ברקע (`claude --bg`)

- הפעלה: `claude --bg -n <שם> "<משימה>" --tools "Read,Grep,Glob"`. המשימה לפני `--tools`. לא משלבים עם `-p`.
- בקשת אישור עוצרת סשן ברקע עד שמישהו עונה. לכן: כלים לקריאה בלבד, או מצב Auto עם השומרים של Level 6. אין `--max-budget-usd` ברקע.
- רשימה: `claude agents --json --all --cwd "$PWD"`. `status` = יש תהליך (busy/idle) או אין (null). `state` = working / done / stopped.
- הצצה: `claude logs <id>`, רק כל עוד יש תהליך. פתיחה: `claude attach <id>`. שם עובד רק על סשן שרץ, ולסשן שנעצר צריך id.
- עצירה: `claude stop <id>`, והשיחה נשמרת. סגירת חלון לא עוצרת. סשן שסיים נשאר idle עד `stop`.
- איך יודעים שסיים: `claude agents --all` מראה `state: done`. ההתראה `agent_completed` מגיעה רק כשמסך agents פתוח; `idle_prompt` מגיעה כ-60 שניות אחרי סיום גם כשהוא סגור.
- לפני שסוגרים את המחשב: `claude agents`, ולעצור כל מה שעדיין חי.


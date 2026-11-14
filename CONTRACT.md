# CONTRACT: מה Claude עושה בפרויקט הזה

**טיוטה, 2026-11-14.** נכתב לחברת צוות ביום הראשון. המקורות: `.claude/settings.json`, ‏`.claude/hooks/`, ‏`CLAUDE.md`, ‏`.claude/rules/`, והכללים של Ita.

בעמודה "מי אוכף" יש שם של חוק הרשאה (`allow:`, ‏`ask:`, ‏`deny:`) או של hook. "המלצה בלבד" פירושו שאין שום מנגנון שעוצר את זה, ורק ההסכמה בין בני אדם שומרת עליו.

## 1. מותר לבד

| מה | מי אוכף |
|---|---|
| `npm run *` (כולל `npm run check`) ו-`npm test` | `allow: Bash(npm run *)`, ‏`allow: Bash(npm test)` |
| `git status`, ‏`git diff`, ‏`git log` | `allow: Bash(git status *)`, ‏`allow: Bash(git diff *)`, ‏`allow: Bash(git log *)` |
| לקרוא עם `grep`, ‏`head`, ‏`tail` | `allow: Bash(grep *)`, ‏`allow: Bash(head *)`, ‏`allow: Bash(tail *)` |
| לקרוא קבצי פרויקט | ברירת המחדל של Claude Code (קריאה בתוך הפרויקט מותרת) ומצב Auto. אין חוק `allow` ל-Read |
| לערוך קבצי פרויקט בכלי Edit/Write, חוץ מהמוגנים בסעיפים 2 ו-3 | ברירת המחדל של Claude Code ומצב Auto. כל עריכה עוברת דרך `guard-writes.mjs` (לפני) ו-`post-edit-check.mjs` (אחרי) |

## 2. צריך לשאול קודם

| מה | מי אוכף |
|---|---|
| `git commit`. Ita מאשרת רק אחרי שבדקה את השינוי. ה-pre-commit מריץ אז `npm run check` | `ask: Bash(git commit *)`, ‏`.githooks/pre-commit` |
| `git push` | `ask: Bash(git push *)` |
| push ו-PR רק בסוף שיעורי הבית (התזמון, לא עצם האישור) | המלצה בלבד. נאכף חלקית: ה-`ask` על push ועל `gh pr *` מבקש אישור בכל פעם, אבל לא בודק שזה סוף שיעורי הבית |
| פתיחת PR (`gh pr create`, וכל `gh pr *`) | `ask: Bash(gh pr *)` |
| `rm` בלי אישור של Ita | `ask: Bash(rm *)` |
| `mv` | `ask: Bash(mv *)` |
| `npm install` | `ask: Bash(npm install *)` |
| עריכת `CLAUDE.md` | `ask: Edit(./CLAUDE.md)` |
| עריכת `_bmad-output/` (ראו גם סעיף 3) | `ask: Edit(./_bmad-output/**)` |

## 3. אסור אף פעם

| מה | מי אוכף |
|---|---|
| `rm -rf` (גם `rm -fr`, ‏`rm -r -f`) | `deny: Bash(rm -rf *)`, ‏`guard-bash.sh` |
| `npm publish` | `deny: Bash(npm publish *)`, ‏`guard-bash.sh` |
| `git push --force` ו-`git push -f` | `deny: Bash(git push --force *)` (רק `--force`), ‏`guard-bash.sh` (גם `-f`) |
| לקרוא או לכתוב `.env` ו-`.env.*` (חוץ מ-`.env.example` ב-Bash) | `deny: Read(./.env)`, ‏`deny: Read(./.env.*)`, ‏`deny: Edit(./.env*)`, ‏`guard-bash.sh`, ‏`guard-writes.mjs` |
| לערוך `.claude/settings.json` | `deny: Edit(./.claude/settings.json)`, ‏`guard-writes.mjs`, ‏`guard-bash.sh` (הפניה, `tee`, ‏`cp`, ‏`mv`, ‏`sed -i`) |
| לכתוב ל-`dist/` | `guard-writes.mjs`, ‏`guard-bash.sh` |
| לכתוב קובץ מחוץ לתיקיית הפרויקט בכלי Edit/Write | `guard-writes.mjs` |
| לכתוב או לשנות קבצים דרך Bash או סקריפטים (רק Edit/Write) | `guard-bash.sh` (חוסם כתיבה ל-`.env`, ל-`settings.json` ול-`dist/`) ו-`bash-write-check.mjs` (משוב, ‏exit 2, על כל קובץ שנוסף, נמחק או השתנה אחרי פקודת Bash). שאר הקבצים לא נחסמים, רק מדווחים אחרי מעשה |
| לקרוא קבצים מ-`~/.claude` | `deny: Read(~/.claude/**)` |
| לקרוא קבצים מחוץ לפרויקט (שאר המחשב) | המלצה בלבד. ‏`deny: Read(~/.claude/**)` מכסה רק את `~/.claude`, ו-`guard-writes.mjs` חל רק על Edit/Write |
| להריץ `claude` בתוך Claude | `deny: Bash(claude)`, ‏`deny: Bash(claude *)` |
| לשנות את `_bmad-output/` ביד ולא דרך סוכני BMAD (`CLAUDE.md`) | המלצה בלבד. נאכף חלקית: `ask: Edit(./_bmad-output/**)` מבקש אישור, אבל לא מבדיל בין עריכה של סוכן BMAD לעריכה ביד |
| `git commit --no-verify` (וגם `git commit -n`, כולל `-nm`), שינוי `core.hooksPath` (`git config` או `git -c`) | `guard-bash.sh` |
| כיבוי חוק lint, סימון טסט `skip` (`check-green-every-commit.md`) | המלצה בלבד. נאכף חלקית: `.githooks/pre-commit` ו-`stop-gate.mjs` תופסים `npm run check` אדום, אבל לא את הכיבוי עצמו |

## 4. מתי לעצור ולדווח

| מה | מי אוכף |
|---|---|
| `npm run check` נשאר אדום אחרי ניסיון תיקון אחד: עוצרים ומדווחים ל-Ita | `stop-gate.mjs` (חוסם סיום פעם אחת, אחר כך מציג ל-Ita הודעה עם סוף הפלט) |
| `npm run check` אדום ואי אפשר לתקן את הקוד: שואלים את Ita (`check-green-every-commit.md`) | `stop-gate.mjs` (בניסיון השני לא חוסם שוב ושולח ל-Ita הודעה עם סוף הפלט) |
| חוק או hook חסם פעולה: לא מנסים לעקוף בדרך אחרת, מדווחים | המלצה בלבד. נאכף חלקית: `guard-bash.sh` סוגר דרכי עקיפה ידועות (`tee`, ‏`cp`, ‏`mv`, ‏`sed -i`, הפניה), אבל לא כל דרך אפשרית |
| `guard-bash.sh` לא הצליח לבדוק פקודה (חסר `jq`, או קלט שלא ניתן לקרוא): הפקודה נחסמת, מדווחים | `guard-bash.sh` (נכשל סגור) |
| טקסט ממשק קשיח בקובץ `src/ui/*.tsx`: מעבירים ל-`src/lib/text.ts` לפני שממשיכים | `post-edit-check.mjs` (משוב, ‏exit 2) |

## מה רץ ברקע

`audit-log.mjs` רושם כל קריאת כלי ב-`logs/agent-audit-YYYY-MM.jsonl` (נתיב או פקודה מקוצרת, בלי תוכן קבצים). הוא אף פעם לא חוסם. כשיש שינוי חריג, אפשר לבדוק שם מה קרה.

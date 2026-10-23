---
title: 'Story 1.1: Project setup and root folder selection'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_commit: 'd63ef3bb9c2e75b8216517195df99bc3885cb252'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-file-browser-bmad-2026-10-22/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-file-browser-bmad-2026-10-22/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אין עדיין קוד. ‏Ita צריכה לבחור תיקייה מהמחשב ולראות אותה כשורש העץ עם התוכן הישיר שלה ממוין, על בסיס פרויקט שהכללים שלו (שכבות, טוקנים, read-only) נאכפים במכונה מהיום הראשון.

**Approach:** הקמה מ-`create-vite` 9.3.1 ‏(`react-ts`) בשורש הריפו, ‏`npm run check` עם oxlint/stylelint/vitest ו-hook של pre-commit, ואז השלד של AD-1..AD-11: ה-port, ה-adapter, ה-fake, ‏state/reducer/controller עם `openFolder` בלבד, ‏`compareEntries`, ‏selectors ברמת השורש, ורכיבי UI בסיסיים.

## Boundaries & Constraints

**Always:** ‏`src/lib` טהור (בלי React/`window`/handles) — **לעולם לא `src/core`**. ‏`src/ui` לא מייבא את `src/adapters`. כל מחרוזת ממשק מ-`src/lib/text.ts`, והטסטים מייבאים אותה. ערכים ליטרליים רק ב-`src/ui/tokens.css` (ערכים בהירים בלבד + `color-scheme: light`). ‏`pickRoot` עם `{ mode: 'read' }` ואף פעם לא זורק. כל בדיקת staleness רק ב-reducer; action שנזרק מחזיר את אותו reference. גרסאות לפי טבלת Stack של ה-spine. כל `describe` מתחיל במזהה FR.

**Never:** ‏`toggle`, ‏`select`, actions של meta, ‏`format.ts`, עיצוב שורה נבחרת (סיפורים 1.2/1.3). אין ESLint, husky, aliases, CSS modules, ‏`@types` ל-FSA, ‏`localStorage`/IndexedDB/רשת, ‏`style={{…}}`, hover, אנימציות, ‏`dir="auto"`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| לא נתמך (FR-2) | ‏`isSupported() === false` | בפס העליון רק `This browser is not supported. Please use Chrome on desktop.`, בלי כפתור; ‏`openFolder()` לא קורא ל-`pickRoot` | — |
| לפני בחירה (FR-6) | אין שורש | רק `Open folder…`; עץ ריק בלי טקסט; חלונית: `Select a file to see its details` | — |
| ביטול (FR-1) | ‏`pickRoot` → ‏`null`, עם או בלי שורש | ‏state = אותו reference, אין הודעה | ה-adapter ממיר כל דחייה של ה-picker ל-`null` |
| בחירה (FR-1/3/4) | ‏`b, A, c, file10, file2, .git/`, ‏`readme`, ‏`README` | שורש ב-depth 0 עם חץ פתוח, ‏`Loading…` מתחתיו; אחרי הקריאה: `.git` ותיקיות קודם, ‏`A, b, c`, ‏`file2` לפני `file10`, ‏`readme`/`README` בסדר קבוע; שם השורש ב-`root-name` | — |
| שורש ריק (FR-3) | תיקייה בלי ילדים | שורת מצב `Empty folder` | — |
| כישלון קריאת שורש | ‏`listChildren` נדחה לפני פריט ראשון | ‏`load: 'failed'`, השורש בלי חץ ובלי שורות מצב | ה-controller תופס; שום שגיאה לא מגיעה ל-UI |
| החלפת שורש (AD-5) | ‏A מעוכב, בוחרים B, ואז A מסתיים | רק B מוצג; התוצאה של A נזרקת (gen ישן) | — |
| אותה תיקייה שוב | בחירה מוצלחת חוזרת | העץ מוחלף, ‏generation עולה, קריאה מחדש | — |

</frozen-after-approval>

## Code Map

- הריפו ריק מקוד: יש רק `_bmad/`, ‏`_bmad-output/`, ‏`.claude/`. אין לגעת בהם. Node 24.22.1 מותקן.
- `ARCHITECTURE-SPINE.md` -- מקור האמת לחוזים: AD-2 (port), AD-3/AD-5/AD-6 (state, staleness, errors), AD-8 (צורת ה-selectors והשורה), AD-10 (חוקי lint מדויקים), Stack, Structural Seed.
- `DESIGN.md` -- הערכים של `tokens.css` (frontmatter: ‏colors/typography/rounded/spacing) ושמות ה-class של הרכיבים.
- `epic-1-context.md` -- תקציר של כל ההחלטות, כולל bidi ו-layout.

## Tasks & Acceptance

**Execution:**
- [x] שורש הריפו -- scaffold של `create-vite@9.3.1 --template react-ts` לתיקייה זמנית והעברה לשורש (בלי לדרוס `_bmad*`/`.claude`); הצמדת הגרסאות; הוספת vitest, jsdom, ‏`@testing-library/*`, stylelint כ-devDependencies; מחיקת `index.css`, ‏`App.css`, ‏`src/assets` ונכסי התבנית שלא בשימוש -- AC-1.
- [x] `package.json`, `.oxlintrc.json`, `.stylelintrc.json`, `.githooks/pre-commit`, `vite.config.ts` -- סקריפטים `check` ו-`prepare` וחוקי האכיפה בדיוק לפי AD-10; Vitest מ-`'vitest/config'`, ‏jsdom, בלי globals -- AC-2.
- [x] `src/lib/source.ts`, `src/lib/text.ts`, `src/lib/sort.ts` -- ה-port עם `SourceRef` branded; כל המחרוזות (כולל אלה של 1.2/1.3); ‏`compareEntries` לפי AD-7.
- [x] `src/lib/state.ts`, `src/lib/reducer.ts`, `src/lib/controller.ts` -- ‏`AppState`, ‏`TreeNode`, ‏`childId`; actions ‏`rootPicked`, ‏`loadSucceeded`, ‏`loadTruncated`, ‏`loadFailed` (נושאים `gen`); ‏`createController` עם `getState`/`subscribe`/`openFolder` -- AD-3/5/6.
- [x] `src/lib/selectors.ts` -- ‏`selectTopBar`; ‏`selectVisibleRows` לשורש ולילדיו הישירים (+ שורת מצב אחת); ‏`selectDetails` שמחזיר `{type:'empty'}` -- AD-8.
- [x] `src/adapters/fsa.d.ts`, `src/adapters/fsaSource.ts` -- ‏`createFsaSource()` לפי AD-2.
- [x] `src/test/fakeSource.ts` -- fake מעץ-אובייקט עם deferreds, כישלון לפני/אחרי N פריטים וב-meta, ו-`isSupported: false` -- AD-11.
- [x] `src/ui/*` + `src/main.tsx` -- ‏`useAppState`, ‏`App`, ‏`TopBar`, ‏`Tree`, ‏`TreeRow` (חץ `<button>` או spacer, כפתור שם עם אייקון, ‏`data-depth`, הזחה ב-`attr()`), ‏`DetailsPanel`, ‏`icons.tsx`, ‏`tokens.css`, ‏`app.css`; ‏`dir="ltr"` + class של `unicode-bidi: isolate` על כל שם -- AC-3, AC-11.
- [x] טסטים לצד הקבצים -- ‏`fsaSource.test.ts`, ‏`sort.test.ts`, ‏`controller.test.ts` (כל שורות המטריצה), ‏`selectors.test.ts`, ‏`App.test.tsx` (RTL: לחיצה על הכפתור ← `openFolder`, מצב לא נתמך).

**Acceptance Criteria:**
- Given ‏`npm install`, when ‏`npm run check`, then ‏tsc, oxlint, stylelint ו-vitest ירוקים, ו-`git config core.hooksPath` הוא `.githooks`.
- Given הפרה זמנית אחת מכל סוג ב-AC-2 של האפיק (import של react ב-lib, adapters ב-ui, ‏`style`, ‏`localStorage`/`fetch`, ‏hex/`px` מחוץ לטוקנים, ‏`:hover`, ‏`transition`, ‏`prefers-color-scheme`), when ‏`npm run check`, then הוא נכשל; ההפרה מוחזרת אחרי הבדיקה.
- Given ‏`npm run dev` ו-Chrome במצב כהה, when פותחים את האפליקציה, then הממשק בהיר: פס עליון לכל הרוחב, עץ ברוחב `tree-width` משמאל וחלונית צמודה מימין.
- Given שורש בשם `דוח סופי (2)`, when הוא מוצג, then ב-`root-name` ובשורת העץ יש `dir="ltr"` ו-`unicode-bidi: isolate`, ושם ארוך נחתך עם `…`.

## Implementation Notes

- scaffold מ-`create-vite@9.3.1` ב-scratchpad והעתקה לשורש; נמחקו `index.css`, ‏`App.css`, ‏`App.tsx`, ‏`src/assets`, ‏`public/icons.svg`, ‏README. ‏`public/favicon.svg` נשאר (בשימוש ב-`index.html`). ‏vite נפתר ל-8.3.5 (בטווח `^8.3.4`).
- ‏`selectVisibleRows` כבר רקורסיבי ותומך בשורת `truncated`; ב-1.1 שום תיקייה מתחת לשורש לא נפתחת, כך שבפועל רק השורש וילדיו מוצגים.
- ה-reducer זורק גם `rootPicked` שה-gen שלו אינו `generation + 1`.
- הכפתורים של החץ והשם בלי handlers — `toggle`/`select` ב-1.2/1.3.
- AC-2 נבדק ידנית: 23 הפרות זמניות, כל אחת הכשילה את `npm run check`, והוחזרו.
- `npm run check` ירוק: 37 טסטים ב-5 קבצים. כל שורות המטריצה מכוסות (controller/selectors/App/fsaSource).
- לא נבדק בדפדפן: AC-3 (מצב כהה), חיתוך שם ארוך, AC-12 — בדיקות ידניות של Ita.

## Spec Change Log

- 2026-10-23 (אישור, Ita): נכתב כ-spec אחד מלא (~3,000 טוקנים) לפי בחירת Ita. הוסר מ-Never האיסור על commit — בשלב Present של bmad-build מתבצע commit כחלק מה-workflow.

## Review Triage Log

| # | מקור | ממצא | Verdict | ראיה | Route |
|---|---|---|---|---|---|
| 1 | BH | תיקייה `failed` לא מציגה `Unable to read this item` | medium | ‏`pushNode`: ‏`unreadable` רק לקבצים; שורש שנכשל ב-1.1 מוצג בלי הודעה (FR-5, ‏UX-DR6, ‏epics 1.2 AC שורה 229) | patch |
| 2 | VG | אין טסט DOM לשורות מצב, חץ/spacer ו-`data-depth` | medium | אומת: ‏`App.test.tsx` בודק רק שם ו-bidi; שבירת `TreeRow` לא מכשילה | patch |
| 3 | VG, BH | ‏`readFileMeta` של ה-adapter בלי טסט | low | אומת ב-`fsaSource.test.ts`; תיקון = הוספת טסט | patch |
| 4 | BH | staleness נבדק רק ל-`loadSucceeded` | low | ‏`isStaleLoad` משותף, אבל אין טסט ל-`loadFailed`/`loadTruncated`; תיקון = טסט | patch |
| 5 | BH | override של tokens מבטל את איסור `light-dark()` | low | ‏`function-disallowed-list: null` ב-override; ‏AD-9 אוסר `light-dark()` | patch |
| 6 | BH | נשאר favicon של Vite | low | ‏`public/favicon.svg` הוא מיתוג התבנית; המשימה: למחוק נכסי תבנית | patch |
| 7 | VG, BH | אין בדיקה אוטומטית לחוקי lint/stylelint | medium | אמיתי, אבל ה-AC של האפיק קובע בדיקה ידנית חד-פעמית; harness הוא עבודה נפרדת | defer |
| 8 | VG, ECH, BH | ‏`window.localStorage`/`globalThis.fetch` עוקפים את החסימה | low | פער ידוע ומקובל ב-AD-10 ("נבדק ב-code review"); התיקון מוסיף חוקים | reject |
| 9 | ECH | listener שזורק עוצר את ה-dispatch | maybe-false | ה-listeners היחידים הם של `useSyncExternalStore`; לא הוצג מסלול שבו הם זורקים | reject |
| 10 | ECH | קריאת השורש הישן ממשיכה עד הסוף | false | לפי ה-spine ‏(Deferred: ‏AbortController לא נדרש) הקריאה ממשיכה והתוצאה נזרקת ב-reducer | reject |
| 11 | ECH | ‏fake: ‏`failAfter` גדול ממספר הילדים לא נכשל | low | עזר טסט; אף טסט לא משתמש בערך כזה | reject |
| 12 | ECH | Chrome לפני 133 בלי `attr()` טיפוסי | false | ה-Stack דורש Chrome 133+ | reject |
| 13 | ECH | הזחה עמוקה חורגת מרוחב העץ | false | ב-1.1 העומק המקסימלי 1; ה-UX קובע בכוונה בלי גלילה אופקית | reject |
| 14 | ECH, BH | ‏`prepare` נכשל מחוץ ל-git | low | הפרויקט רץ רק מקומית מתוך הריפו (spine: אין CI/אירוח) | reject |
| 15 | ECH | ה-hook בודק גם שינויים לא staged | low | נדיר בשימוש יומיומי; התיקון (stash) מוסיף מורכבות | reject |
| 16 | ECH | הגרסאות לא "מוצמדות" | false | טבלת Stack עצמה מגדירה טווחי `^`/`~`, והם תואמים | reject |
| 17 | BH | רשימת היחידות חלקית; ‏`color-scheme` חוזר ב-`.app` | false | ‏AD-10 מגדיר בדיוק `px/rem/em`; ‏DESIGN.md › components.app כולל `color-scheme: light` | reject |
| 18 | BH | פריטי Never (‏`dir="auto"`, aliases…) בלי חוק lint | false | ה-spec וה-spine לא דורשים חוק להם; נבדקים ב-review | reject |
| 19 | BH | לחץ אין שם נגיש; הכפתורים לא עושים כלום | false | ‏ARIA ומקלדת נדחו ב-spine; ה-handlers שייכים ל-1.2/1.3 לפי ה-spec | reject |
| 20 | BH | ‏sprint-status ‏`in-progress` מול spec ‏`in-review` | false | שלב Present מסנכרן ל-`review` (step-05) | reject |
| 21 | BH | ‏`pickRoot` של ה-fake מחזיר `null` כשהתור ריק | low | לא סביר שיפגע; טסטים משתמשים ב-`queueCancel` במפורש | reject |
| 22 | BH | ‏`openFolder` בלי try סביב `pickRoot` | false | החוזה (AD-2) קובע ש-`pickRoot` אף פעם לא זורק, וה-adapter נבדק על זה | reject |
| 23 | BH | בלי `.nvmrc`/engine-strict | low | ‏`engines` מוגדר; תוספת לא נדרשת ולא סבירה לפגוע | reject |

## Design Notes

- ה-root הוא `''`; גם ילד של השורש מקבל `childId('', name) = name`. שורת מצב: key ‏`parentId + '\u0000status'`.
- `openFolder`: ‏`if (!supported) return` → ‏`pickRoot()` → ‏`null` ⇒ return בלי dispatch → אחרת `gen = state.generation + 1`, ‏`rootPicked(gen, entry)`, ואז `try { for await (… of source.listChildren(ref)) collect } catch { truncated/failed לפי מספר הפריטים }` ושליחת action אחד בסוף.
- `listChildren` של ה-adapter: ‏`for await (const h of dir.values())` → ‏`{ name: h.name, kind: h.kind, ref }`.

## Verification

**Commands:**
- `npm run check` -- expected: ירוק, בלי אזהרות.
- `grep -rn "describe('FR-" src` -- expected: יש describe ל-FR-1, FR-2, FR-3, FR-4, FR-6.

**Manual checks (if no CLI):**
- ‏`npm run dev` ב-Chrome, ‏`Open folder…`, תיקייה אמיתית: Chrome לא מבקש הרשאת כתיבה, והתוכן הישיר מוצג ממוין (AC-12, ‏Ita בודקת).

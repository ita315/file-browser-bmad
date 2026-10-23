---
title: 'Story 1.3: Item selection and details panel'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_commit: '77800675761109aa66e601812983afcb967b93c0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אחרי 1.2 אפשר לטייל בעץ, אבל לחיצה על שם לא עושה כלום, והחלונית תמיד מציגה `Select a file to see its details`. אי אפשר לראות סוג, גודל ותאריך של קובץ.

**Approach:** ‏`controller.select(id)` עם ה-actions ‏`fileSelected`, ‏`folderSelected`, ‏`metaLoaded` ו-`metaFailed` (AD-5, AD-6). ‏`format.ts` עם `formatType`, ‏`formatSize` ו-`formatDate` (AD-7). ‏`selectDetails` המלא (AD-8). ‏`DetailsPanel` עם `details-row`, כפתור השם מחובר ל-`select`, ועיצוב `tree-row--selected`.

## Boundaries & Constraints

**Always:** כל בדיקות ה-staleness וה"כבר נבחר" רק ב-reducer: action שנזרק מחזיר אותו reference, וה-controller קורא ל-`readFileMeta` רק אם `fileSelected` שינה את ה-state. ‏`requestId` עולה בכל `select` של קובץ (מונה ב-controller). ‏`metaLoaded` נזרק אם gen או requestId השתנו. ‏`metaFailed` נזרק רק אם gen השתנה, תמיד מסמן `unreadable`, ומאפס בחירה רק כש-requestId תואם. כל שגיאה של `readFileMeta` נתפסת ב-controller. הפורמט רק ב-`format.ts` (שלמים, בלי תלות ב-locale), והרכיבים מקבלים מחרוזות מוכנות. כל `describe` מתחיל במזהה FR, ויש `describe` ל-FR-1 עד FR-8.

**Never:** ‏cache של meta, ‏`AbortController`, ניסיון חוזר לפריט לא קריא, קריאה מהדיסק בבחירת תיקייה, ‏toggle בלחיצה על שם, ‏`style={{…}}`, ‏`:hover`, ‏ARIA מעבר לאלמנטים נייטיב, שינוי של `toggled`/`loadFailed` בנוגע לבחירה.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| קובץ (AC-1) | ‏`report.pdf`, ‏1,500 בתים | בזמן הקריאה: `Name` + `Loading…`; אחר כך `Name`/`Type`/`Size`/`Modified` = ‏`report.pdf`/`PDF`/`1.5 KB`/תאריך; השורה `selected` | — |
| ‏`formatType` (AC-2) | ‏`report.pdf`, ‏`archive.tar.gz`, ‏`.env.local`, ‏`.gitignore`, ‏`README`, ‏`file.` | ‏`PDF`, ‏`GZ`, ‏`LOCAL`, ‏`—`, ‏`—`, ‏`—` | — |
| ‏`formatSize` (AC-3) | כל טבלת FR-7 ב-PRD | בדיוק עמודת "מוצג" (‏`1,049`←`1 KB`, ‏`999,950`←`1 MB`, ‏`1.5 TB`) | — |
| ‏`formatDate` (AC-4) | זמן ידוע + `timeZone` מפורש; ‏`null`; ‏`NaN` | ‏`Oct 22, 2026, 3:20 PM` עם רווח רגיל; ‏`—`; ‏`—` | — |
| תיקייה (AC-5) | תיקייה סגורה; תיקייה פתוחה | רק `Name` ו-`Type: Folder`; נשארת סגורה/פתוחה; אין `readFileMeta`/`listChildren` | — |
| תוצאה ישנה (AC-6) | A ו-B מעוכבים; A←B, A מסתיים אחרון; A←B←A | מוצג B; ברצף מוצג A; ‏`select` על הנבחר = אותו reference בלי קריאה; כל `select` אחר של קובץ קורא שוב | requestId |
| קובץ שנכשל (AC-7) | ‏`locked.txt` עם `failMeta` | הודעה ליד השם, לא נבחר, חלונית ריקה; אם בינתיים נבחר קובץ אחר — רק הסימון, הבחירה החדשה נשארת | ‏`metaFailed` |
| פריט ידוע כלא קריא (AC-8) | קובץ `unreadable` או תיקייה `failed` | בחירה מתאפסת, חלונית ריקה, אין קריאה מהדיסק | — |
| בחירה מוסתרת (AC-9) | קובץ נבחר עם פרטים, סוגרים את ההורה; תיקייה נבחרת ואז נכשלת בפתיחה | הקובץ נשאר נבחר והפרטים נשארים; התיקייה נשארת נבחרת, החלונית לא משתנה | — |
| החלפת שורש (AC-10) | קובץ נבחר, בוחרים שורש (גם אותו) | בחירה מתאפסת, חלונית ריקה; ‏meta ישן שמגיע אחר כך נזרק | gen |
| עיצוב (AC-11) | קובץ נבחר עם שם ארוך בעברית | שורה עם `tree-row--selected` (רקע `selected`, פס `box-shadow: inset`, אייקון וחץ בצבע הטקסט); בחלונית תוויות ברוחב `details-label-width`, ‏`tabular-nums`, שם מלא עם `dir="ltr"`, ‏`bidi-isolate`, ‏`overflow-wrap: anywhere` | ‏RTL: class, ‏`dir`, טקסטים וסדר; צבעים ופריסה — ידני |
| מקצה לקצה (AC-12, ידני) | ‏`npm run dev`, תיקייה אמיתית | ‏UJ-1 עובד, פרטים תואמים ל-Finder, החלונית צמודה לעץ מימין, תיקייה חסומה לא עוצרת את העץ | ידני |
| ניסוי FR-5 לקובץ (ידני) | קובץ עם `chmod 000` ב-Chrome | ‏Ita רושמת אם `getFile()` נכשל (הודעה ליד השם) או לא (פרטים מוצגים). אם לא נכשל — בודקים קובץ שנמחק אחרי שהתיקייה נקראה (PRD §9) | ידני, לא חוסם |

</frozen-after-approval>

## Code Map

- `src/lib/state.ts` -- ‏`Details` כרגע רק `none`; להרחיב ל-`loading { id, requestId }` ו-`ready { id, requestId, size, lastModified }`. להוסיף 4 actions.
- `src/lib/reducer.ts` -- ‏`rootPicked` כבר מאפס `selectedId`/`details`; ‏`toggled`/`loadFailed` לא נוגעים בבחירה — לא לשנות. להוסיף 4 cases.
- `src/lib/controller.ts` -- ‏`dispatch` מחזיר מוקדם כש-reference זהה. להוסיף `select(id)` ל-`Controller` ומונה `requestSeq`.
- `src/lib/format.ts` -- חדש. אלגוריתם הגודל ב-PRD addendum (‏`Math.round(bytes * 10 / unit)` בשלמים, ואז מעבר ב-1000).
- `src/lib/selectors.ts` -- ‏`ItemRow.selected` קיים. להחליף את `DetailsView`/`selectDetails` לפי AD-8.
- `src/lib/text.ts` -- כל התוויות (`labelName`…`unknownValue`, ‏`typeFolder`) כבר קיימות.
- `src/ui/TreeRow.tsx`, `Tree.tsx`, `App.tsx` -- כפתור השם בלי handler; להעביר `onSelect(id)` (‏`void controller.select(id)`) ולהוסיף `tree-row--selected`.
- `src/ui/DetailsPanel.tsx`, `src/ui/app.css` -- ‏`details-panel`/`details-empty` קיימים; להוסיף `details-row` ו-`tree-row--selected`. הטוקנים `--color-selected`, ‏`--spacing-selection-bar`, ‏`--spacing-details-label-width` כבר ב-`tokens.css`.
- `src/test/fakeSource.ts` -- ‏`file({ size, lastModified, failMeta, gate })` ו-`calls.readFileMeta` מספיקים.
- `src/adapters/fsaSource.ts` -- ‏`readFileMeta` קיים ונבדק (`describe('FR-7 …')`); לא לשנות.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/format.ts`, `src/lib/format.test.ts` -- שלוש הפונקציות; טסטים לטבלאות AC-2..AC-4 (`describe('FR-7 …')`).
- [x] `src/lib/state.ts`, `src/lib/reducer.ts` -- ‏`Details` ו-4 actions לפי Design Notes.
- [x] `src/lib/controller.ts` -- ‏`select(id): Promise<void>`, לא נדחה לעולם.
- [x] `src/lib/selectors.ts` -- ‏`selectDetails` → `empty | loading | file | folder` עם מחרוזות מוכנות.
- [x] `src/ui/App.tsx`, `Tree.tsx`, `TreeRow.tsx`, `DetailsPanel.tsx`, `app.css` -- חיבור `onSelect`, ‏`details-row` (`<dl>`), ‏`Loading…` בסגנון `status-row-text`, ‏`tree-row--selected`.
- [x] `src/lib/controller.test.ts`, `src/lib/selectors.test.ts` -- כל שורות המטריצה מול ה-fake; reducer: כל action שנזרק מחזיר אותו reference. ‏`describe` של FR-3, FR-5, FR-6, FR-7, FR-8.
- [x] `src/ui/App.test.tsx` -- ‏RTL: לחיצה על שם בוחרת ולא פותחת/סוגרת; ‏`tree-row--selected`; סדר התוויות; שם עם `dir="ltr"` ו-`bidi-isolate`; ‏`Loading…`; חזרה ל-prompt.

**Acceptance Criteria:**
- Given כל הקוד, when ‏`npm run check`, then ירוק בלי אזהרות, ו-`grep "describe('FR-"` מוצא כל אחד מ-FR-1 עד FR-8.

## Design Notes

החלטות שלא נראות למשתמש: action נפרד לתיקייה (`folderSelected`) כדי שה-reducer, ולא ה-controller, יחליט על איפוס בחירה לפריט לא קריא. ה-controller יודע אם לקרוא לפי שינוי ה-reference.

```ts
async select(id) {
  const node = state.nodes.get(id);
  if (!node) return;
  if (node.kind === 'directory') return dispatch({ type: 'folderSelected', id });
  const gen = state.generation, requestId = ++requestSeq, before = state;
  dispatch({ type: 'fileSelected', gen, id, requestId });
  if (state === before || state.selectedId !== id) return; // נבחר כבר, או unreadable
  try { const meta = await source.readFileMeta(node.ref);
        dispatch({ type: 'metaLoaded', gen, requestId, meta }); }
  catch { dispatch({ type: 'metaFailed', gen, id, requestId }); }
}
```

‏`fileSelected`: קובץ `unreadable` ← ‏`selectedId: null`, ‏`details: none`; ‏`selectedId === id` ← אותו reference; אחרת `selectedId: id`, ‏`details: loading`. ‏`folderSelected`: ‏`failed` ← איפוס; אחרת `selectedId: id`, ‏`details: none`. ‏`selectDetails`: ‏`loading`/`ready` לפי `details`; אחרת תיקייה נבחרת ← `folder`; אחרת `empty`. ‏`selectDetails` קורא ל-`formatDate` בלי `timeZone` (שעון מקומי), ולכן טסט ה-selector משווה ל-`formatDate(ms)` עצמו.

## Verification

**Commands:**
- `npm run check` -- expected: ירוק, בלי אזהרות.
- `grep -rhoE "describe\('FR-[0-9]" src | sort -u` -- expected: ‏FR-1 עד FR-8.

**Manual checks (if no CLI):**
- AC-11 (Ita): רקע ופס של השורה הנבחרת, אייקון וחץ בצבע הטקסט, עמודת תוויות, שם עברי ארוך נשבר במלואו בחלונית.
- AC-12 (Ita): ‏UJ-1 מקצה לקצה ב-Chrome מול Finder.
- ניסוי FR-5 (Ita): לחיצה על קובץ `chmod 000`; לרשום ב-`.memlog.md` של הארכיטקטורה אם `getFile()` נכשל. אם לא — לבדוק קובץ שנמחק אחרי קריאת התיקייה.

## Implementation Notes

- ‏`select`, ‏`fileSelected`/`folderSelected`/`metaLoaded`/`metaFailed` בדיוק לפי Design Notes. ‏`metaFailed` על קובץ שכבר `unreadable` ובלי בחירה תואמת מחזיר אותו reference.
- ‏`.details-list` הוא `<dl>` בעמודה, וכל `.details-row` הוא grid של שתי עמודות (תווית ברוחב `details-label-width`). ‏`Loading…` מתחת לשורת `Name` עם `status-row-text`.
- ‏`formatSize` לפי ה-addendum: ‏`Math.round(bytes * 10 / unit)` ומעבר יחידה כש-tenths ≥ 10000; מעל TB נשאר TB.
- המימוש התחיל ב-subagent שנקטע (מגבלת שימוש) אחרי הקוד וטסטי ה-controller; טסטי reducer/`selectDetails` ‏(`selectors.test.ts`) וטסטי RTL ‏(`App.test.tsx`) נכתבו אחר כך ישירות.
- ‏`npm run check` ירוק: 134 טסטים ב-6 קבצים (אחרי תיקוני ה-review #8, #10, #13). ‏`describe` קיים ל-FR-1 עד FR-8.
- לא נבדק בדפדפן: AC-11 (צבעים ופריסה), AC-12, וניסוי FR-5 לקובץ — בדיקות ידניות של Ita.

## Spec Change Log

## Review Triage Log

| # | מקור | ממצא | Verdict | ראיה | Route |
|---|---|---|---|---|---|
| 1 | BH, ECH, VG | ‏A←B←A: הקריאה הראשונה של A נכשלת והשלישית מצליחה ← A נבחר, עם פרטים, ומסומן `unreadable` | low | אמיתי, אבל דורש כישלון חד-פעמי (שגיאת הרשאה חוזרת גם בקריאה השלישית ומאפסת נכון) ומרוץ לחיצות; התיקון מוסיף ענף ל-`metaLoaded`/`metaFailed` מעבר לכלל AD-5 | reject |
| 2 | ECH | לחיצה חוזרת על הקובץ הנבחר אחרי סימון ישן מאפסת בחירה | low | אותו שורש ואותו תרחיש נדיר כמו #1 | reject |
| 3 | ECH | ‏`metaLoaded` לא בודק ש-`details.id` קיים | false | ‏`nodes` מוחלף רק ב-`rootPicked`, שמעלה gen ומאפס `details`; בדיקת ה-gen מכסה | reject |
| 4 | ECH | ‏`formatDate` זורק RangeError ל-ms מחוץ לטווח Date | false | הערך מגיע מ-`File.lastModified`, שתמיד תאריך תקין | reject |
| 5 | ECH, BH | ‏`formatSize` עם NaN או שלילי | false | ‏`Blob.size` תמיד שלם אי-שלילי | reject |
| 6 | ECH | מפרידים אחרים מ-U+202F לפני AM/PM | low | ‏ICU של Node ו-Chrome מפיק U+202F, והטסט מקבע אותו; הבדיקה הידנית של התאריך ב-Chrome תתפוס סטייה | reject |
| 7 | ECH | ‏listener שנכנס מחדש ל-`select` בתוך `dispatch` | false | ה-listeners היחידים הם של `useSyncExternalStore`, שלא קוראים ל-controller באופן סינכרוני (כמו 1.2 #5) | reject |
| 8 | BH | חסרים טסטים ל-same reference: ‏`metaFailed` על קובץ שכבר מסומן, על תיקייה, על id לא קיים; ‏`folderSelected` על id לא קיים | low | אומת; תוספת טסטים ישירה | patch |
| 9 | BH | ‏`Intl.DateTimeFormat` נבנה בכל קריאה | low | ‏`selectDetails` רץ פעם בשינוי state; אין השפעה מורגשת | reject |
| 10 | BH | השוואה ל-`NO_DETAILS` לפי reference | low | כל `none` במערכת הוא `NO_DETAILS`, אבל התיקון ישיר: ‏`details.kind === 'none'` | patch |
| 11 | BH | ענף `!node` ב-`selectDetails` לא נבדק | false | לא נגיש: ‏`details` מתאפס בכל החלפת `nodes` | reject |
| 12 | BH | ‏RTL לא בודק שהחץ לא בוחר, ולא AC-8 לתיקייה | false / low | החץ: טסט AC-1 של 1.2 בודק `selectedId` null אחרי לחיצה; AC-8 מכוסה ב-controller, וה-UI רק מרנדר state | reject |
| 13 | BH | ‏RTL לא בודק ש-`Loading…` בסגנון `status-row-text`; לא בודק תיקייה פתוחה שנשארת פתוחה | low | ה-class: תיקון טסט ישיר; תיקייה פתוחה מכוסה ב-controller | patch (class) |
| 14 | BH | חסרים מקרי `formatType` כמו `..`, ‏`a..b`, ‏`photo.JPeG` | low | הכלל וכל הדוגמאות של ה-PRD נבדקים; המקרים הנוספים נובעים מאותו כלל | reject |
| — | VG | אין פערי אימות (מלבד #1) | — | בדק שכל התנהגות שהשתנתה נבדקת, ושהטסט של U+202F לא ריק | — |

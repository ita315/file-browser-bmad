---
title: 'Story 1.2: Expand and collapse folders, including unreadable items'
type: 'feature'
created: '2026-10-23'
status: 'done'
baseline_commit: 'a2704732cce87f266b2edb0395047ad73dda3886'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אחרי 1.1 רואים רק את השורש וילדיו הישירים: החצים לא עושים כלום, ואי אפשר לרדת לעומק העץ או לראות שתיקיית משנה חסומה.

**Approach:** ‏`controller.toggle(id)` עם ה-actions ‏`toggled` ו-`loadStarted` לפי AD-6 (קריאה אחת לתיקייה בכל `generation`, ‏staleness רק ב-reducer), וחיבור כפתור החץ ב-`TreeRow` ל-`toggle`. ‏`selectVisibleRows`, שורות המצב והתצוגה של `failed`/`truncated` כבר קיימים מ-1.1 ומקבלים כאן כיסוי טסטים בעומק.

## Boundaries & Constraints

**Always:** ‏`toggled` רק הופך את `expanded` ולא נוגע ב-`load` או ב-`selectedId`; על קובץ, תיקייה `failed` או id לא קיים — אותו reference. ‏`loadStarted` נזרק (אותו reference) אם ה-gen ישן או ש-`load !== 'unloaded'`. רק ה-controller מחליט לקרוא מהדיסק. ה-`try` עוטף גם את `listChildren` וגם את ה-`for await`. כל `describe` מתחיל במזהה FR. ‏`src/lib` טהור.

**Never:** ‏`select`, ‏`onClick` על כפתור השם, actions של meta, ‏`format.ts`, עיצוב שורה נבחרת (1.3). אין ‏`AbortController`, ‏cache בין generations, ניסיון חוזר לתיקייה `failed`, גלילה אופקית בעץ, ‏`style={{…}}`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| פתיחה (AC-1) | ‏`src` סגורה, ‏`unloaded` | חץ `expanded`, ‏`Loading…` ב-depth 2, ואז הילדים ממוינים ב-depth 2; ‏`selectedId` לא משתנה | — |
| סגירה ופתיחה (AC-2) | ‏`src` נקראה | הצאצאים נעלמים וחוזרים; ‏`calls.listChildren` של `src` = 1; גם השורש נסגר ונפתח | — |
| סגירה בזמן טעינה (AC-3) | ‏`src` מעוכבת | סגירה לא עוצרת; פתיחה לפני הסיום ← `Loading…`; אחרי הסיום ← התוכן; בכל מקרה קריאה אחת | — |
| ריקה (AC-4) | תיקיית משנה בלי ילדים | ‏`Empty folder` ב-depth +1, בלי כפתור | — |
| נכשלה (AC-5) | ‏`secret`: ‏`failAfter: 0` | ‏`Unable to read this item` ליד השם, spacer במקום חץ, אין שורות מתחת; ‏`toggle` נוסף לא קורא שוב; תיקיות אחרות נפתחות | ‏`loadFailed` |
| שורש שנכשל (AC-6) | ‏`listChildren` של השורש נכשל | הודעה ליד שם השורש, בלי חץ | קיים מ-1.1, נבדק |
| כישלון באמצע (AC-7) | ‏`logs`: ‏`failAfter: 2` | שני הפריטים ממוינים, ואחרי כל תת-העץ של `logs` שורת מצב אחת `Unable to read this item` בלי שם; אין `Empty folder` | ‏`loadTruncated` |
| שגיאה לא דולפת (AC-8) | כל אחד בנפרד: הקריאה ל-`listChildren` עצמה זורקת (source עוטף בטסט), ‏`failAfter` ‏(0 ו-N), ‏`next()` שנדחה, ‏gate נדחה | ‏`toggle` לא נדחה ולא זורק, ה-state מגיע ל-`failed`/`truncated` לפי מספר הפריטים, ו-UI ממשיך לעבוד | ה-controller תופס |
| תוצאה ישנה (AC-9) | ‏`src` מעוכבת, נבחר שורש חדש, ואז `src` מסתיימת | התוכן לא נכנס לעץ החדש (גם אם יש בו `src`) | ‏gen ישן ← אותו reference |
| מבנה השורה (AC-10, ‏UX-DR4/5/6/9/11) | עץ בכמה רמות, קבצים, ושם ארוך עם `Unable to read this item` | בכל שורה `<button>` לחץ (או spacer באותו רוחב לקובץ ולתיקייה `failed`) ו-`<button>` לשם שמתמשך עד סוף השורה; הזחה רק מ-`data-depth`, אף פעם לא `style`; אייקונים וחץ SVG inline עם `currentColor`, בלי `width`/`height`/`stroke-width` כ-attributes; ההודעה מוצגת במלואה באפור נטוי והשם נחתך לפניה; לעץ אין גלילה אופקית; ב-Tab טבעת ה-focus בתוך השורה, על החץ או על השם | מה שניתן לבדוק ב-RTL (כפתורים/spacer, ‏`data-depth`, אין `style`, ‏attributes של SVG, טקסט ההודעה) — בטסט; חיתוך, צבע, גלילה ו-focus — בדיקה ידנית |
| ניסוי FR-5 ידני (AC-11) | תיקייה אמיתית עם קובץ ותיקייה אחרי `chmod 000`, ב-Chrome | ‏Ita רושמת ב-`.memlog.md` של הארכיטקטורה (או בהערה לסיפור) אילו מקרים באמת נכשלים; תיקייה חסומה מציגה `Unable to read this item` ושאר העץ עובד | ידני, לא חוסם |

</frozen-after-approval>

## Code Map

- `src/lib/state.ts` -- ‏`Action`: להוסיף `toggled { id }` ו-`loadStarted { gen, id }`.
- `src/lib/reducer.ts` -- ‏`isStaleLoad`/`withContents` קיימים ומשמשים כמו שהם; להוסיף שני cases.
- `src/lib/controller.ts` -- ‏`loadFolder(gen, id, ref)` קיים; ‏`openFolder` לא משתנה. להוסיף `toggle` ל-`Controller`.
- `src/lib/selectors.ts` -- ‏`pushNode` כבר DFS מלא עם שורות מצב, ‏`chevron` ו-`unreadable` לתיקייה `failed`. לא לשנות אלא אם טסט חושף באג.
- `src/ui/TreeRow.tsx`, `src/ui/Tree.tsx`, `src/ui/App.tsx` -- כפתור החץ בלי handler; להעביר `onToggle(id)` מ-`App` (‏`void controller.toggle(id)`).
- `src/ui/app.css` -- הזחה ב-`attr(data-depth)`, ‏focus-ring פנימי, ‏`unreadable-message` כבר קיימים; לאמת בלבד.
- `src/test/fakeSource.ts` -- ‏`dir(children, { failAfter, gate })`, ‏`deferred()`, ‏`flush()`, ‏`calls.listChildren` (מערך של `FakeDir`). מספיק כמו שהוא.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/state.ts`, `src/lib/reducer.ts` -- שני ה-actions וה-cases לפי Always.
- [x] `src/lib/controller.ts` -- ‏`toggle(id): Promise<void>`: ‏`toggled`; אם הצומת פתוח עכשיו ו-`unloaded` ← ‏`loadStarted(state.generation, id)` ו-`await loadFolder`.
- [x] `src/ui/App.tsx`, `src/ui/Tree.tsx`, `src/ui/TreeRow.tsx` -- ‏`onToggle` דרך ה-props ל-`onClick` של כפתור החץ בלבד.
- [x] `src/lib/controller.test.ts`, `src/lib/selectors.test.ts` -- כל שורות המטריצה מול ה-fake (ל-AC-8: גם source עוטף שבו `listChildren` זורק מיד, וגם iterator ש-`next()` שלו נדחה), ‏reducer: ‏`toggled`/`loadStarted` שנזרקים מחזירים אותו reference.
- [x] `src/ui/App.test.tsx` -- ‏RTL ל-AC-1 ול-AC-10: לחיצה על חץ פותחת/סוגרת ולא בוחרת; ‏`data-depth` 2; חץ `<button>` או spacer (קובץ, תיקייה `failed`) ו-`<button>` לשם בכל שורה; שורת `Unable to read this item` אחרי תת-העץ; אין `style` ואין `width`/`height`/`stroke-width` על SVG.

**Acceptance Criteria:**
- Given עץ בכמה רמות, when ‏`npm run check`, then הכל ירוק ויש `describe` ל-FR-3 ול-FR-5 שמכסים את כל שורות המטריצה.
- Given ‏`npm run dev`, when לוחצים Tab בעץ, then טבעת ה-focus בתוך השורה, על החץ או על השם; שם ארוך נחתך לפני `Unable to read this item` שמוצג במלואו, באפור נטוי.

## Design Notes

```ts
async toggle(id) {
  dispatch({ type: 'toggled', id });
  const node = state.nodes.get(id);
  if (!node || !state.expanded.has(id) || node.load !== 'unloaded') return;
  const gen = state.generation;
  dispatch({ type: 'loadStarted', gen, id });
  await loadFolder(gen, id, node.ref);
}
```

## Verification

**Commands:**
- `npm run check` -- expected: ירוק, בלי אזהרות.

**Manual checks (if no CLI):**
- AC-10 (Ita): ב-`npm run dev` — שם ארוך נחתך לפני ההודעה המלאה (אפור נטוי), אין גלילה אופקית בעץ, ‏Tab מציג focus-ring בתוך השורה.
- AC-11 (Ita): תיקייה וקובץ עם `chmod 000` ב-Chrome; לרשום ב-`.memlog.md` של הארכיטקטורה או בהערה לסיפור איזה מקרה נכשל באמת.

## Implementation Notes

- ‏`toggled`/`loadStarted` ב-reducer, ‏`toggle` ב-controller בדיוק לפי Design Notes. ‏`selectors.ts`, ‏`app.css`, ‏`fakeSource.ts` לא שונו — הטסטים בעומק לא חשפו באג.
- AC-8: ‏"`listChildren` זורק מיד" נבדק עם source עוטף; ‏"`next()` נדחה" עם iterator שנבנה ביד (לפני הפריט הראשון ואחרי אחד).
- ‏`npm run check` ירוק: 75 טסטים ב-5 קבצים (73 + שני טסטים מתיקוני ה-review).
- לא נבדק בדפדפן: חיתוך שם לפני ההודעה, גלילה אופקית ו-focus-ring (AC-10), וניסוי `chmod 000` ‏(AC-11) — בדיקות ידניות של Ita.

## Spec Change Log

- 2026-10-23 (לפני אישור, Ita): נשאר spec אחד מלא, בערך 2,800 טוקנים. נוספו למטריצה שורות ל-AC-10 ול-AC-11, ושורת AC-8 מפרטת עכשיו את כל מקרי הכישלון.

## Review Triage Log

| # | מקור | ממצא | Verdict | ראיה | Route |
|---|---|---|---|---|---|
| 1 | BH | בדיקות "`selectedId` לא משתנה" ריקות מתוכן (null לפני ואחרי) | low | אומת: אף טסט לא מזריע `selectedId` לא-null; תיקון ישיר בטסט | patch |
| 2 | BH | ‏AC-9 לא בודק מקרה שבו `src` החדשה ב-`loading` כשהתוצאה הישנה מגיעה | low | אומת: בטסט הקיים גם בדיקת `load` זורקת; התיקון = טסט אחד | patch |
| 3 | BH | לחץ בלי `aria-label`/`aria-expanded` | false | ‏ARIA מעבר לאלמנטים נייטיב נדחה ב-spine וב-epic context (כמו 1.1 #19) | reject |
| 4 | BH | תיקייה `failed` נשארת ב-`expanded` | low | נכון, אבל רק `selectVisibleRows` קורא את `expanded`, ו-`chevronOf` בודק `failed` קודם; אין צרכן שנפגע, ובחירת שורש מאפסת | reject |
| 5 | BH | ‏listener שזורק הופך את `toggle` ל-rejected | maybe-false | כמו 1.1 #9: ה-listeners היחידים הם של `useSyncExternalStore`; לא הוצג מסלול שבו הם זורקים, ואם כן — זה low | reject |
| 6 | BH | אין טסט ל-toggle של השורש בזמן שהוא נטען | low | אותו מסלול קוד כמו AC-3 על תת-תיקייה (‏`toggled` לא בודק id); תוספת לא נדרשת | reject |
| 7 | BH | הזחה תלויה ב-`attr()` טיפוסי בלי fallback | false | ה-Stack דורש Chrome 133+ (כמו 1.1 #12) | reject |
| 8 | BH | ‏sources העוטפים ב-AC-8 לא רושמים קריאות | low | עזרי טסט; "לא נקרא שוב" נבדק ב-AC-5 עם `failAfter: 0` | reject |
| 9 | BH | אין טסט RTL להתאוששות אחרי כישלון | low | ה-controller-tests בודקים שתיקייה אחרת נפתחת אחרי כל כישלון; ה-UI רק מרנדר state | reject |
| 10 | BH | ה-diff לא כולל את ה-spec ואת sprint-status | false | בכוונה: ה-spec נמסר רק לשכבת edge-case כ-claims_file | reject |
| — | ECH | אין ממצאים | — | — | — |
| — | VG | אין פערי אימות | — | בדק רגרסיות קטנות (gen הפוך, id במקום name, חיווט לשם) — כולן מכשילות טסט | — |

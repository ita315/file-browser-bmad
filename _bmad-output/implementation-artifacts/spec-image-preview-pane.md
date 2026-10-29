---
title: 'חלונית תצוגה לתמונות'
type: 'feature'
created: '2026-10-29'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: 'dae7db1de5326f5b287573f8e10fbbb1b9d217c9'
context:
  - '{project-root}/.claude/rules/file-type-by-extension.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** כשבוחרים קובץ תמונה בעץ, רואים רק את הפרטים שלו ולא את התמונה.

**Approach:** כשבוחרים קובץ תמונה, מופיעה מימין עמודה שלישית בכל הגובה (עץ, פרטים, תצוגה), ובה התמונה כולה, שומרת על היחס שלה. סוג הקובץ נקבע מרשימה אחת של סיומות, כך שאפשר יהיה להוסיף בהמשך סוג חדש ברשומה אחת ובמקרה אחד ב-UI.

## Boundaries & Constraints

**Always:** תמונה מזהים לפי הסיומת בלבד: ‏`png, jpg, jpeg, gif, webp, avif, svg`, בלי הבדל בין אותיות גדולות לקטנות (`.claude/rules/file-type-by-extension.md`). כל תמונה, כולל svg, מוצגת רק בתגית `<img>`, כדי שקוד בתוך קובץ svg לא ירוץ. מוצגת רק התמונה של הקובץ האחרון שנבחר. כל הטקסטים ב-`text.ts`. ערכים רק ב-`tokens.css`.

**Decisions (Ita, 2026-10-29):** פריסה: אם באזור שמימין לעץ יש לפחות `details-width` + `preview-min-width` (‏320 + 480, כלומר חלון של 1120px ומעלה), הפרטים ברוחב קבוע 320 והתצוגה מימינם ממלאת את כל השאר, בכל הגובה. אם האזור צר יותר, התצוגה יורדת מתחת לפרטים ותופסת את כל הרוחב של האזור הימני ואת שאר הגובה. ‏`app-min-width` נשאר 640px. טוקנים חדשים: ‏`--spacing-details-width: 320px`, ‏`--spacing-preview-min-width: 480px`. בלי תמונה, הפריסה כמו היום.

**Decisions (Ita, 2026-10-29, אחרי בדיקה ב-Chrome):** מעבר בין קבצי תמונה בלי מצב ביניים: מה שמוצג בעמודה (התמונה הקודמת, או ההודעה `Unable to display this file`) נשאר עד שהתמונה החדשה נקראה ופוענחה, ואז מתחלף בבת אחת, בלי אנימציה. `Loading…` מופיע רק כשאין מה להשאיר: התמונה הראשונה, או מעבר מקובץ שאינו תמונה (כמו היום).

**Never:** ספריות חדשות. ‏`file.type`/`blob.type`. ‏`<object>`, ‏`<iframe>`, ‏`<embed>`, ‏`dangerouslySetInnerHTML` או inline SVG לתוכן הקובץ. שינוי בהתנהגות של העץ ושל חלונית הפרטים. עריכה של מסמכים ב-`_bmad-output/planning-artifacts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| תמונה ראשונה | בוחרים `photo.JPG` כשלא הוצגה תמונה (או אחרי `notes.txt`) | העמודה מופיעה: קודם `Loading…`, ואז התמונה | N/A |
| מעבר בין תמונות | A מוצגת, בוחרים B | A נשארת עד ש-B פוענחה, ואז B מחליפה אותה בבת אחת; אין `Loading…` ואין אזור ריק | N/A |
| מעבר מהודעה | A הציגה `Unable to display this file`, בוחרים B | ההודעה נשארת עד ש-B פוענחה, ואז B | N/A |
| לא תמונה | `notes.txt`, ‏`.png` (מוסתר, בלי סיומת), תיקייה, או שום דבר | אין עמודה שלישית | N/A |
| קובץ פגום | `broken.png` שלא מצליח להתפענח | `Unable to display this file` במקום התמונה | הפענוח נכשל |
| הקריאה נכשלה | `readFile` נדחה, ‏metadata הצליח | `Unable to display this file` | ‏`previewFailed` |
| הקובץ לא קריא | `readFileMeta` נכשל | הבחירה מתבטלת, העמודה נעלמת (כמו היום) | ‏`metaFailed` מנקה גם את התצוגה |
| מעבר מהיר | A ואז B, והתוכן של A מגיע אחרון | מוצגת רק B | ‏`previewLoaded` של A נזרק לפי `requestId` |
| מעבר מהיר בפענוח | מ-X בוחרים B ואז C, והפענוח של B מסתיים אחרי ש-C נבחר | B לא מוצגת אף פעם; X נשארת עד ש-C פוענחה | תוצאת הפענוח של B נזרקת |

</frozen-after-approval>

## Code Map

- `src/lib/source.ts` -- ה-port. מוסיפים `readFile(file): Promise<Blob>` (ה-spine, שורה 316, צפה את זה).
- `src/adapters/fsaSource.ts` -- ‏`readFile` = `getFile()`. לא קוראים `.type`.
- `src/test/fakeSource.ts` -- ‏`file()` מקבל `content?: Blob`, ‏`failRead?`, ‏`readGate?`, ומתעד `calls.readFile`. ה-`gate` הקיים נשאר של `readFileMeta` בלבד.
- `src/lib/state.ts` -- ‏`AppState.preview` ושתי פעולות חדשות. ‏`Details` לא משתנה.
- `src/lib/reducer.ts` -- ‏`fileSelected` קובע את `preview`. ‏`clearSelection`, ‏`rootPicked`, ‏`folderSelected` ו-`metaFailed` (current) מאפסים אותו. לא לגעת בשאר הלוגיקה.
- `src/lib/controller.ts` -- ‏`select` מפעיל את `readFile` במקביל ל-`readFileMeta`, ורק כשהרדיוסר העביר את `preview` ל-`loading`.
- `src/lib/selectors.ts` -- ‏`selectPreview`. ‏`selectDetails` לא משתנה.
- **סבב 2 (מעבר בלי הבהוב), מה כבר קיים:** כל הקוד והטסטים של סבב 1 נשארים (ראו Spec Change Log). היום `fileSelected` מעביר את `preview` ל-`loading` בלי זיכרון של מה שהוצג (`reducer.ts`, case `fileSelected`); `selectPreview` מחזיר `{type:'loading'}` ל-`loading`; `PreviewPane` מרנדר `Loading…` ל-`loading`, ו-`ImagePreview` עם `key={view.key}` נבנה מחדש בכל בחירה, עם `<img>` בלי `src` עד שה-effect רץ. אלה שלושת המקורות של מצב הביניים.
- `src/lib/format.ts` -- ‏`formatType` כבר מכיל את חוק הנקודה (`dot <= 0`). לא לשנות. ‏`extensionOf` החדש משתמש באותו חוק.
- `src/ui/App.tsx` -- עוטף את `DetailsPanel` ואת `PreviewPane` החדש ב-`<div className="app-side">`, ומוסיף `app-side--with-preview` כשיש תצוגה.
- `src/ui/app.css`, ‏`src/ui/tokens.css` -- ‏`DetailsPanel` ו-`PreviewPane` עוברים לתוך עטיפה חדשה `.app-side` (ראו Design Notes). ‏`.details-panel` הקיים לא משתנה. החוקים החדשים חלים רק תחת `.app-side--with-preview`.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/fileKinds.ts` (+ `.test.ts`) -- ‏`extensionOf(name)` ו-`previewOf(name): { kind: 'image'; mime: string } | null`, מטבלה אחת של סיומת → `{kind, mime}` -- נקודת ההרחבה לסוגים הבאים.
- [x] `src/lib/source.ts`, ‏`src/adapters/fsaSource.ts` (+ test), ‏`src/test/fakeSource.ts` -- ‏`readFile`.
- [x] `src/lib/state.ts`, ‏`src/lib/reducer.ts`, ‏`src/lib/text.ts` -- ‏`Preview` = `none | loading | ready(blob) | failed`, עם `id` ו-`requestId`. פעולות `previewLoaded`/`previewFailed` נזרקות כשה-gen או ה-`requestId` לא תואמים. ‏`TEXT.unableToDisplay`.
- [x] `src/lib/controller.ts` -- ‏`select` קורא את התוכן. אף פעם לא נדחה.
- [x] `src/lib/selectors.ts` -- ‏`selectPreview`: ‏`none | loading | image{blob, mime, key} | unavailable`.
- [x] `src/ui/PreviewPane.tsx`, ‏`App.tsx`, ‏`app.css`, ‏`tokens.css` -- פריסה לפי Design Notes. ‏`switch` על הסוג. ‏`ImagePreview` יוצר object URL מ-`new Blob([blob], {type: mime})` ב-effect ומשחרר אותו ב-cleanup. ‏`onError` עובר ל-`unavailable`. ‏`key` הוא ה-`requestId`.
- [x] טסטים: ‏`fileKinds.test.ts`, ‏`controller.test.ts`, ‏`selectors.test.ts`, ‏`App.test.tsx` -- כל השורות במטריצה.
- [x] `src/lib/state.ts`, `src/lib/reducer.ts` -- ל-`Preview` מסוג `loading` נוסף `shown`: התוכן המיושב האחרון (`ready` או `failed`, עם `id`/`requestId` שלו) או `null`. `fileSelected` של תמונה: `shown` = ה-`preview` הנוכחי אם הוא `ready`/`failed`, ה-`shown` שלו אם הוא `loading` (A→B→C שומר את A), אחרת `null`. כל שאר המעברים כמו היום.
- [x] `src/lib/selectors.ts` -- `loading` עם `shown` מחזיר את התצוגה של `shown` (תמונה עם ה-blob וה-mime של הצומת של `shown`, או `unavailable`); `loading` בלי `shown` מחזיר `loading`.
- [x] `src/ui/PreviewPane.tsx` -- רכיב תמונה אחד שנשאר mounted לאורך `image`↔`unavailable` (בלי `key` לכל בחירה). ל-blob חדש: object URL, טעינה ל-`new Image()` נסתר ו-`await decode()`, ורק אז `src` של ה-`<img>` הגלוי מתחלף וההודעה (אם הוצגה) יורדת. `decode()` נכשל → `Unable to display this file`. ה-cleanup של ה-effect מסמן ביטול, כך שפענוח שהסתיים אחרי שינוי נזרק, ומשחרר את ה-URL שלו אם לא הוצג. ה-URL של התמונה המוצגת משתחרר כשהיא מוחלפת או כשהרכיב יורד. `setState` רק מתוך ה-promise, לא סינכרונית ב-effect (oxlint).
- [x] טסטים -- reducer/selectors: `shown` בכל המעברים (תמונה→תמונה, A→B→C, `failed`→תמונה, לא-תמונה→תמונה, תיקייה, שורש חדש). RTL (`decode` מוחלף ב-deferred, כמו `createObjectURL`): A→B: ה-`src` של A לא משתנה ואין `Loading…` עד ש-B פוענחה, ואחר כך `<img>` אחד עם B; פענוח שנכשל; הודעה→תמונה; X→B→C עם פענוח מאוחר של B; שחרור URLs. הטסט הישיר של `key` מסבב 1 מוחלף בטסט שמכסה את אותו סיכון (הודעה לא "נדבקת" לתמונה הבאה).

**Acceptance Criteria:**
- Given שנבחרה תמונה, when העמודה מוצגת, then יש בה `<img>` אחד בלבד, עם `src` מסוג `blob:`, ואין `object`, ‏`iframe` או `embed`.
- Given שנבחרה תמונה, when בוחרים תיקייה או פותחים שורש חדש, then העמודה נעלמת, ותוכן מאוחר של התמונה נזרק.
- Given שהתמונה הוחלפה או שהעמודה נעלמה, when הרכיב מתעדכן, then ה-object URL הקודם משוחרר (`revokeObjectURL`).
- Given כל הטסטים הקיימים, when מריצים `npm run check`, then הכול ירוק, בלי שינוי בטסטים של העץ ושל הפרטים.

## Implementation Notes

- ‏`npm run check` ירוק: ‏189 טסטים (היו 134). הטסטים הקיימים של העץ והפרטים לא השתנו, רק שורות ה-import בשלושה קבצי טסט.
- ‏`ImagePreview` לא שומר את ה-URL ב-state: ה-effect יוצר את ה-object URL וכותב אותו ישירות ל-`src` של ה-`<img>` דרך `ref`, וה-cleanup משחרר אותו. ‏`setState` בתוך ה-effect נכשל ב-oxlint (`react(set-state-in-effect)`). ה-`<img>` נוצר בלי `src` ומקבל אותו מיד ב-effect.
- ‏`select` מריץ את `readFileMeta` ואת `readFile` עם `Promise.all`, וכל אחד מהם בתוך `try/catch` משלו, כך ש-`select` אף פעם לא נדחה. ‏`readFile` רץ רק אם אחרי `fileSelected` ה-`preview` הוא `loading` עם אותו `requestId`.
- ‏`selectPreview` מחזיר `none` אם הצומת כבר לא קיים או שאין לו סוג תצוגה, גם כשה-state לא `none`.
- ‏`.preview-pane` מקבל `padding: var(--spacing-4)` (בשביל ההודעות). ה-`<img>` ממוקם ב-`position: absolute`, ולכן ה-padding לא משפיע עליו. שאר ה-CSS הוא בדיוק זה של ה-mockup (`mockups/image-preview-layout.html`).
- ‏`key={requestId}` לא נחוץ בזרימה דרך ה-controller, כי כל בחירה עוברת דרך `loading`, שמסיר את `ImagePreview` מה-DOM. הוא מגן על מעבר ישיר מ-ready ל-ready, ולכן נבדק ברינדור ישיר של `PreviewPane` ב-`App.test.tsx`.
- לא נבדק ידנית בדפדפן (ה-Manual checks ב-Verification נשארים ל-Ita).
- **סבב 2:** ‏`npm run check` ירוק: ‏204 טסטים (היו 189). הטסטים של העץ והפרטים לא השתנו. בטסטים הקיימים של התצוגה עודכנו רק הציפיות לצורה החדשה (`shown: null` ב-`loading`, ‏`held` במקום `key`), והטסט הישיר של `key` הוחלף ב-"a message does not stick to the next image".
- **סבב 2, סטייה מה-Tasks (בגלל שורת המטריצה "מעבר מהיר בפענוח"):** לפי הכלל של `shown`, ב-X→B→C כש-B כבר `ready` (נקראה, עוד לא פוענחה) ה-`shown` של C הוא B, כי ה-lib לא יודע מה פוענח. לכן ל-`PreviewView` מסוג `image` נוסף `held: boolean` (במקום `key`): ‏`true` כשזה תוכן של `shown`. ‏`ImagePreview` מציג `held` כמו שהוא ולא מתחיל בשבילו פענוח, וה-cleanup מבטל את הפענוח של B. כך B לא מוצגת אף פעם ו-X נשארת עד ש-C פוענחה. ‏`selectPreview` עדיין מחזיר את התצוגה של `shown`, כמו ב-Tasks.
- **סבב 2, ‏`ImagePreview`:** ההערות של סבב 1 על `ref` ועל `key={requestId}` כבר לא נכונות. ה-URL המוצג נשמר ב-state (`setState` רק מתוך ה-promise של `decode()`, ו-`onError` של ה-`<img>` הגלוי), ו-`src` נקבע ב-JSX. ה-URL המוצג משתחרר ב-effect נפרד שתלוי בו (כשהוא מוחלף או כשהרכיב יורד); URL של פענוח שבוטל משתחרר כשהפענוח מסתיים. קריאה שנכשלה (`unavailable`) מחליפה מיד את מה שמוצג בהודעה, דרך עדכון state בזמן render ולא ב-effect. בתמונה ראשונה, עד שהפענוח מסתיים, מוצג `Loading…`.
- **סבב 2:** ‏`image` ו-`unavailable` מרנדרים אותו אלמנט ב-`PreviewPane`, כך ש-`ImagePreview` נשאר mounted ביניהם. בדיקות מוטציה: הסרת `held`, הסרת עדכון ההודעה, והסרת השחרור של פענוח שבוטל, כל אחת מפילה טסט RTL.
- **סבב 2:** לא נבדק ידנית בדפדפן (ציור באותו frame אחרי `decode()`, ‏svg ו-avif). נשאר ל-Ita.

## Spec Change Log

- **סבב 2 (2026-10-29), intent_gap מבדיקה ידנית של Ita ב-Chrome:** במעבר בין תמונות נראה הבהוב. הסיבה: A → `Loading…` → `<img>` ריק → B (`fileSelected` מאפס את התצוגה, `key` בונה את `ImagePreview` מחדש, ו-`src` נקבע רק ב-effect). Ita שינתה את הבלוק המוקפא: שורה 1 במטריצה פוצלה, נוספו השורות "מעבר בין תמונות", "מעבר מהודעה" ו"מעבר מהיר בפענוח", ונוספה החלטה. תוקנו Code Map, Tasks ו-Design Notes. המצב שנמנע: מצב ביניים גלוי בין שתי תמונות. **KEEP:** כל קוד סבב 1 נשאר, בלי revert (`fileKinds`, `readFile`, `Preview` והפעולות, controller, פריסה ו-CSS, וכל הטסטים שלא נוגעים ל-`key`), כי השינוי נוגע רק למעבר בין תמונות, ובנייה מחדש מאפס הייתה מסכנת את מה שכבר עבר review. הצבע הצהוב לא נמצא בקוד (אין צהוב ב-`src/ui`); החשוד העיקרי הוא "Highlight updates" של React DevTools.

## Review Triage Log

| # | Layer | Finding | Verdict | Evidence | Route |
|---|-------|---------|---------|----------|-------|
| 1 | VG, BH | אף טסט לא בודק את ה-`type` של ה-Blob שנשלח ל-`createObjectURL`; הסרת `{type: mime}` הייתה נשארת ירוקה | medium | ‏VG אומת מראש: הטסטים קוראים רק `.text()`; זה החוזה של `file-type-by-extension` ושל svg | patch |
| 2 | VG, BH | איפוס הדגל `broken` דרך `key={requestId}` לא נבדק | medium | ‏VG אומת מראש: הטסט היחיד עם `fireEvent.error` לא בוחר תמונה שנייה | patch |
| 3 | BH | הטסט "removes the column when the file turns out unreadable" עובר בלי לבדוק כלום (`[]` מול `[]`) | medium | ‏`failMeta` בלי gate: ‏`metaFailed` מגיע לפני `previewLoaded`, אז אף URL לא נוצר (`App.test.tsx:418-425`) | patch |
| 4 | BH, ECH | אין גבול לגודל קובץ לפני קריאה ופענוח | low | אמיתי, אבל לא סביר בשימוש יומיומי (תמונות מקומיות), ‏`getFile()` לא טוען את הקובץ לזיכרון לפני ה-`<img>`, והתיקון מוסיף סף וענף שה-intent לא ביקש | reject |
| 5 | BH | ‏`alt=""` מסתיר את התמונה מטכנולוגיה מסייעת | low | השם מוצג בחלונית הפרטים שצמודה לתמונה; נגישות מעבר לנייטיב נדחתה ב-spine; התיקון מוסיף שדה ל-`PreviewView` | reject |
| 6 | BH | ‏`100000` ו-`0 *` ב-app.css מפרים את AD-9 | false | ‏AD-9 והאכיפה עוסקים בערכי עיצוב (צבע, יחידות); ‏app.css כבר מכיל מספרים בלי יחידה (`flex: 1`), וה-multiplier מוסבר בהערה | reject |
| 7 | BH | שני הטוקנים החדשים לא מופיעים ב-DESIGN.md | low | נכון, אבל התיקון הוא עריכה של `planning-artifacts`, שה-intent אוסר; מדווח ב-Present כמסמך לא מעודכן | reject |
| 8 | BH | ‏`extensionOf` משכפל את החוק של `formatType` | low | ה-spec בחר במכוון לא לגעת ב-`formatType`; שני הקבצים בודקים את אותם מקרי קצה (`.png`, ‏`trailing.`) ומסכימים | reject |
| 9 | BH | כש-`readFileMeta` נכשל אחרי שהתוכן הגיע, התמונה מופיעה ונעלמת | false | זו ההתנהגות שבמטריצה ("הקובץ לא קריא: העמודה נעלמת") | reject |
| 10 | BH, ECH | ‏`readFile` שנכשל לא נקרא שוב כשבוחרים שוב את אותו קובץ | low | עקבי עם הכלל הקיים "בחירה חוזרת בקובץ הנבחר = no-op"; נדיר; התיקון מוסיף ענף ל-`fileSelected` | reject |
| 11 | BH, ECH | ‏`min-height: min-content` מבטל גלילה בפרטים, ובחלון נמוך מאוד התצוגה מתכווצת לאפס | low | דורש פרטים גבוהים מהחלון (שם ארוך מאוד בחלון של כמה מאות px); ארבע שורות פרטים; נבדק ב-spike בגבהים 400-1600 | reject |
| 12 | ECH | ה-afterEach מוחק את `URL.createObjectURL` במקום לשחזר | false | ב-jsdom הסטטיים האלה לא קיימים, כך שמחיקה מחזירה בדיוק את המצב המקורי | reject |
| 13 | VG (סבב 2) | הענף שבזמן רינדור (`blob === null` כשתמונה מוצגת) לא נבדק: תמונה → קריאה נכשלת → תמונה | medium | VG אומת מראש: `failRead` מופיע רק כבחירה ראשונה או כקובץ יחיד; צמצום התנאי היה משאיר את A על המסך ואת ה-URL שלה לא משוחרר | patch |
| 14 | ECH (סבב 2) | URL דולף כש-`decode()` מסתיים באותו batch שמסיר את `ImagePreview` | low | אמיתי רק כשה-promise וה-unmount נופלים באותו tick; אחרת ה-cleanup מסמן `cancelled` וה-URL משוחרר; התיקון מוסיף ref ו-cleanup | reject |
| 15 | ECH (סבב 2) | בדיוק ב-breakpoint (`--x` = 0) לתצוגה יש גם גבול שמאלי וגם עליון | low | אומת: `clamp(0, b - 0, b)` = b; תיקון ישיר בביטוי אחד | patch |
| 16 | ECH (סבב 2) | משימה מסבב 1 ב-spec עדיין מזכירה `key` | low | התיקון הוא עריכה של ה-spec של הבנייה הזו; ה-Implementation Notes כבר אומרים שה-`key` הוסר | reject |
| 17 | BH (סבב 2) | ההערה ב-`fileKinds.ts` אומרת שסוג חדש = רשומה אחת ומקרה אחד, אבל צריך גם `FilePreview`, ‏`PreviewView` ו-`settledView` | low | אומת: `settledView` בונה תמיד את צורת התמונה, ו-TS ייכשל על סוג חדש; ההרחבה היא דרישה מפורשת של Ita | patch |
| 18 | BH (סבב 2) | ‏`.bmp`, ‏`.ico`, ‏`.apng` חסרים | false | הרשימה נקבעה ב-intent (Always) | reject |
| 19 | BH (סבב 2) | ה-probe לא נעצר, וה-`<img>` הגלוי מפענח שוב | low | ההסתמכות על ה-cache של Chrome מתועדת ב-Design Notes ובבדיקה הידנית; פענוח שננטש בתמונה מקומית לא סביר שיורגש | reject |
| 20 | BH (סבב 2) | בזמן הטעינה, A מוצגת ליד הפרטים של B בלי סימון | false | זו ההחלטה המפורשת של Ita בבלוק המוקפא (בלי `Loading…` בין תמונות) | reject |
| 21 | BH (סבב 2) | ‏`PreviewMessage` משתמש ב-`status-row-text` של העץ | false | ה-Design Notes קובעים את הסגנון הזה, ו-`DetailsPanel` (`details-loading`) כבר משתמש באותה מחלקה | reject |
| 22 | BH (סבב 2) | ה-afterEach מוחק את `URL.createObjectURL` במקום לשחזר | false | carried: כמו #12, ב-jsdom הם לא קיימים | reject |
| 23 | BH (סבב 2) | ‏`flush` כפול ו-`setTimeout` מחוץ ל-`act` יגרמו לאזהרות או לחוסר יציבות | false | הרצה של `App.test.tsx`: אפס אזהרות `act`, והטסטים יציבים | reject |
| 24 | BH (סבב 2) | ה-`describe` החדשים בלי תגי FR/AC | low | לפיצ'ר אין מספרי FR ב-PRD, וה-ACs ב-spec לא ממוספרים; השמות מתארים את שורות המטריצה | reject |
| 25 | BH (סבב 2) | אין טסט controller לבחירה של תמונה שכבר סומנה לא קריאה | low | אותה יציאה מוקדמת (`state.selectedId !== id`) קודמת לשתי הקריאות, והיא נבדקת כבר ב-1.3 עבור `readFileMeta`; ה-reducer נבדק עבור ה-preview | reject |
| 26 | BH (סבב 2) | ‏`selectPreview` עושה את אותו lookup פעמיים | low | ‏O(1) על Map, פעם אחת בכל שינוי state; אין השפעה מורגשת | reject |

## Design Notes

- ה-MIME של ה-object URL נקבע מהסיומת (`mime` בטבלה) ולא מהדפדפן. כך svg מוצג גם אם הדפדפן מנחש לא נכון, ואין צורך ב-spike.
- הדגל של קובץ פגום הוא state מקומי ברכיב התמונה, כי זו תוצאה של הפענוח ולא של קריאה מהדיסק. הוא מתאפס רק כשתמונה חדשה פוענחה בהצלחה (סבב 2; ה-`key` לכל בחירה הוסר).
- **מעבר בלי הבהוב (סבב 2):** ה-lib מחליט *מה* להשאיר (`shown`), וה-UI מחליט *מתי* להחליף (אחרי `decode()`). כך ה-lib לא תלוי בדפדפן, והחלפה של `src` לתמונה שכבר פוענחה מצוירת ב-Chrome באותו frame. זה נבדק ידנית.
- **פריסה (spike, ‏Chrome 156 headless, ‏2026-10-29: ‏1120px = צד-לצד, ‏1119px ו-640px = אחד מתחת לשני, וגם בגובה 1600px):** אין media query, כי `px` אסור מחוץ ל-tokens ו-`var()` לא עובד בתנאי של query. במקום זה: ‏`.app-side` הוא `flex-direction: column` עם `container-type: size`, ועל הילדים `--x: calc((100cqw - (details-width + preview-min-width)) * 100000)`. ‏`--x` אי-שלילי = רחב. כל ערך מתחלף דרך `clamp`:
  ```css
  .details-panel { flex: 0 0 clamp(0%, var(--x) + 100cqh, 100cqh); min-height: min-content;
    width: clamp(var(--spacing-details-width), var(--spacing-details-width) - var(--x), 100cqw); }
  .preview-pane  { flex: 1 1 0; min-height: 0;
    margin-top: clamp(-100cqh, -100cqh - var(--x), 0%);
    margin-left: clamp(0%, var(--spacing-details-width) + var(--x), var(--spacing-details-width)); }
  ```
  ‏`min-height: min-content` חובה, כי `overflow-y: auto` מאפס את ה-min-height ומכווץ את הפרטים לשורה אחת. ב-app.css כותבים `0%` במקום `0px`, כי stylelint אוסר `px` (בדפדפן התוצאה זהה). הקו המפריד: ‏`border-left-width`/`border-top-width` מתחלפים באותה דרך, אבל עם גבול תחתון `0 * var(--spacing-border-width)` ולא `0%`. ‏`border-width` לא מקבל אחוזים, וערך לא תקין עם `var()` נופל ל-`medium` (3px). ‏jsdom לא מחשב layout, ולכן זה נבדק ידנית.
- העיצוב של העמודה: גבול בצבע `--color-border` כמו ב-`.tree`, רקע `--color-background`, ‏padding ‏`--spacing-4`, ‏`.preview-pane` עם `position: relative`, ו-`<img>` עם `position: absolute; inset: var(--spacing-4); width/height: calc(100% - 2 * var(--spacing-4)); object-fit: contain` (כמו ב-spike), כך שהתמונה כולה נראית במרכז ושומרת על היחס. ‏`Loading…` ו-`Unable to display this file` בסגנון `status-row-text`.

## Verification

**Commands:**
- `npm run check` -- expected: ירוק, כולל: ‏`photo.JPG` תמונה, ‏`notes.txt` ו-`.png` לא תמונה, ובמעבר A→B מוצגת רק B.

**Manual checks (Chrome):**
- פריסה בחלון של 1120px (צד-לצד) ושל 1119px ו-640px (מתחת לפרטים). תמונה גבוהה ותמונה רחבה. ‏svg, כולל svg עם `<script>`. ‏avif. קובץ `.png` פגום. בלי תמונה, הפריסה כמו קודם. מעבר בין שתי תמונות גדולות (כמה MB): אין `Loading…`, אין לבן ואין הבהוב; הודעה→תמונה; לחיצות מהירות על שלוש תמונות.

---
title: "Reconcile review: ARCHITECTURE-SPINE מול הקלטים"
created: 2026-10-22
spine: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../prds/prd-file-browser-bmad-2026-10-22/prd.md
  - ../../../prds/prd-file-browser-bmad-2026-10-22/addendum.md
  - ../../../briefs/brief-file-browser-bmad-2026-10-22/addendum.md
  - ../../../ux-designs/ux-file-browser-bmad-2026-10-22/EXPERIENCE.md
  - ../../../ux-designs/ux-file-browser-bmad-2026-10-22/DESIGN.md
---

# Reconcile review

**שורה תחתונה:** ה-spine מכסה היטב את כל ה-FR, את שני ה-[NOTE FOR ARCHITECTURE] ואת כל ההחלטות שה-PRD השאיר לשלב הארכיטקטורה. יש סתירה פנימית אחת (AD-5 מול AD-6), וכמה דרישות שקטות של ה-UX (בלי hover, בלי אנימציות, איפוס של `<button>`, אייקוני SVG, ה-boilerplate של התבנית) לא נאכפות ולא נכתבו. בנוסף חסרים הטיפוסים של TypeScript ל-FSA.

חומרה: **H** חוסם או יוצר מימוש שגוי · **M** סביר שייפול במימוש · **L** הבהרה.

## 1. סתירות

| # | חומרה | איפה | הממצא | תיקון מוצע |
|---|---|---|---|---|
| C1 | H | AD-5, AD-6, sequence diagram | לפי AD-5 ולפי התרשים, `metaFailed` נזרק אם `selectedId` השתנה. לפי AD-6, כשל ב-`readFileMeta` מסמן את הקובץ `unreadable: true`, והבחירה מתבטלת רק "אם הוא עדיין נבחר". כלומר AD-6 מניח שהסימון קורה גם כשהבחירה זזה. שני מפתחים יממשו את זה אחרת, ולשני המימושים יהיה טסט ירוק. | להחליט ולכתוב ב-AD-5: בדיקת `selectedId` חלה רק על `metaLoaded`. ‏`metaFailed` עם אותו `generation` תמיד מסמן `unreadable`, ומבטל את הבחירה רק אם הקובץ עדיין נבחר. לעדכן את התרשים. |
| C2 | L | Conventions › שמות CSS | ב-DESIGN.md הרכיב נקרא `tree-row-selected`, וה-spine כותב `.tree-row--selected` (BEM). זה סותר את הכלל "class לפי השם ב-DESIGN.md". | לכתוב במפורש שרכיבי מצב ב-DESIGN.md (`tree-row-selected`) ממופים ל-modifier, או להשתמש בשם של DESIGN.md. |
| C3 | L | AD-6 מול TreeNode/selector | לתיקייה שנכשלה יש `load: 'failed'`, ולקובץ שנכשל יש `unreadable: true`. בשורת `item` של `selectVisibleRows` יש רק `unreadable`. לא כתוב שהערך שלו נגזר משני המקורות, ולא כתוב ששורת פריט צריכה לדעת אם להציג חץ (תיקייה שנכשלה: בלי חץ, והמקום שלו נשמר). | להוסיף לשורת `item` את `hasChevron` (או `load`), ולכתוב: `unreadable = load==='failed' \|\| node.unreadable`. מתחת לתיקייה `failed` לא נוצרות שורות מצב. |

## 2. [NOTE FOR ARCHITECTURE]

| מקור | הערה | סטטוס |
|---|---|---|
| EXPERIENCE › Component Patterns | החץ והשם כשני `<button>`, בלי ARIA | **נכלל** ב-AD-8. **חסר (M):** לפי UX, שטח הלחיצה של השם הוא "כל השורה, מהאייקון ועד הקצה". ה-spine לא קובע שהאייקון נמצא בתוך כפתור השם ושהכפתור נמתח עד קצה השורה. |
| DESIGN › Colors | ‏`light-dark()` או ערכים בהירים בלבד | **נכלל** ב-AD-9: בהירים בלבד. |

## 3. מה שה-PRD וה-addendum השאירו "לשלב הארכיטקטורה"

| פריט | סטטוס |
|---|---|
| הבדיקה הידנית של FR-5 (PRD §9, addendum) | **נכלל חלקית.** הניסוי נדחה ל-story הראשון (Open Questions). זה מקובל, אבל זה לא "בשלב הארכיטקטורה" כמו שה-PRD קבע. **חסר (L):** ברירת המחדל מזכירה רק תיקייה עם `chmod 000`. ה-PRD וה-addendum מציעים גם "קובץ שנמחק אחרי שהתיקייה נקראה", וזו האפשרות היחידה שבודקת ידנית את מקרה 2 (כשל של `getFile()` ← `NotFoundError`). מומלץ לכלול את שתיהן. |
| אכיפה של NFR-3/NFR-4 (PRD §9, addendum) | **נכלל** ב-AD-10. פערים בסעיף 4 (N4, N5, N6). |
| U+202F (addendum FR-7) | **נכלל** ב-AD-7: מוחלף ברווח רגיל. |
| מצב מפורש לכל פריט (addendum FR-5) | **נכלל** ב-AD-6. |
| מזהה בחירת שורש (addendum FR-3) | **נכלל** ב-AD-5 (`generation`). |
| מיון עם Collator ו-code points | **נכלל** ב-AD-7. |
| גודל בחשבון שלמים | **נכלל** ב-AD-7 (הפניה ל-addendum). |
| הזרקת `timeZone` לטסטים | **נכלל** ב-AD-7 וב-AD-11. |
| ‏`dir="auto"` (addendum › הערות ל-UX) | **נדחה בכוונה** לטובת `dir="ltr"`, לפי EXPERIENCE. ה-spine עקבי: ‏`dir="ltr"` מופיע רק ב-Conventions › bidi, ואין אזכור סותר. **חסר (M):** ה-spine לא כותב שזה מחליף את ההמלצה של ה-addendum, אף שה-addendum מופיע ב-`sources`. מפתח שיקרא את ה-addendum עלול להשתמש ב-`dir="auto"`. |

## 4. דרישות שקטות

| # | דרישה | מקור | סטטוס | תיקון מוצע |
|---|---|---|---|---|
| N1 | בלי רשת | PRD §1, §5 | נאכף בחלקו: `no-restricted-globals` על `fetch`/`XHR`/`WebSocket`. לא נחסמים `window.fetch` (גישה דרך property עוקפת את `no-restricted-globals`), ‏`EventSource`, ‏`navigator.sendBeacon`, ו-`@import`/`url()` של גופני web ב-CSS. | (L) להוסיף `no-restricted-properties` על `window.*`, ולחסום `EventSource`. ב-stylelint: ‏`at-rule-disallowed-list: [import, font-face]`. |
| N2 | בלי שמירה בין טעינות | PRD §5, brief addendum | נאכף בחלקו: אותה עקיפה דרך `window.localStorage`. ‏`document.cookie` ו-`caches` לא נחסמים. ה-handles נשמרים רק בזיכרון (AD-2). | (L) כמו N1. |
| N3 | בורר לקריאה בלבד | FR-1 | **נכלל** ב-AD-2 וב-AD-11(ד). ב-port אין מתודות כתיבה. | — |
| N4 | בלי hover, בלי אנימציות ומעברים, הסמן תמיד רגיל | EXPERIENCE › Interaction Primitives, DESIGN › Do's | **לא נכלל.** אין AD ואין חוק lint. | (M) להוסיף ל-stylelint: ‏`selector-pseudo-class-disallowed-list: [hover]`, ‏`property-disallowed-list: [transition, animation]`, ‏`declaration-property-value-disallowed-list: { cursor: [pointer] }`. |
| N5 | איפוס של `<button>` | AD-8 + DESIGN (שורה שטוחה, בלי hover) | **לא נכלל.** הכפתורים הרגילים של Chrome מגיעים עם רקע, מסגרת, padding ושינוי ב-hover (‏`appearance: auto`). שני כפתורים בכל שורה יירשו את כל אלה. | (M) לכתוב ב-Conventions: ‏reset אחד (`appearance: none; background: none; border: 0; font: inherit; color: inherit; padding: 0`) ב-`app.css`. לבדוק אם `color-named: never` מתיר `transparent`/`currentcolor`. |
| N6 | אייקונים וחץ כ-SVG inline, בגודל ובעובי קו מהטוקנים | DESIGN › Components, NFR-4 | **לא נכלל.** ב-`icons.tsx` יהיו מאפיינים כמו `width="14"` ו-`strokeWidth="1.5"`. ‏`react/forbid-dom-props` חוסם רק את `style`, ו-stylelint לא קורא TSX. כך ערכי עיצוב עוקפים את NFR-4. | (M) לקבוע ב-AD-9/AD-10: ל-SVG אין `width`/`height`/`stroke-width`, רק `viewBox` ו-class. הגודל והעובי מגיעים מ-CSS (`var(--spacing-icon)`, ‏`var(--spacing-icon-stroke)`), ו-`stroke="currentColor"`. אפשר לאכוף עם `forbid-dom-props` על `width`/`height`/`strokeWidth`. |
| N7 | V1 תמיד בהיר, `color-scheme: light`, לא מגיב ל-`prefers-color-scheme` | EXPERIENCE › Accessibility/Responsive, DESIGN | **נכלל** ב-AD-9. **חסר (M):** התבנית של create-vite (`react-ts`) מגיעה עם `src/index.css` ו-`src/App.css`, ובהם `color-scheme: light dark`, ‏`@media (prefers-color-scheme: …)` וצבעי hex. ה-Structural Seed לא מזכיר אותם ולא אומר למחוק אותם. | לכתוב ב-Structural Seed שמוחקים את `index.css`, ‏`App.css` ו-`assets/` של התבנית. להוסיף ל-stylelint את `media-feature-name-disallowed-list: [prefers-color-scheme]`. |
| N8 | תאריכים באנגלית, בפורמט קבוע | FR-7, NFR-6 | **נכלל** ב-AD-7 (`en-US`, החלפה של U+202F, ‏`—`). | — |
| N9 | ‏`dir="ltr"` + `unicode-bidi: isolate` על כל שם | EXPERIENCE › Bidi | **נכלל** ב-Conventions. ראו סעיף 3 (לא נכתב שזה מחליף את `dir="auto"`). | (M) להוסיף משפט: "נדחה `dir="auto"` של ה-PRD addendum, לפי EXPERIENCE › Bidi". |
| N10 | ‏`tree-width` קבוע, ‏`app-min-width`, גלילה לרוחב, העץ גולל לאורך בנפרד, ‏`overflow-x: hidden` | EXPERIENCE › IA/Responsive, DESIGN › Layout | **מכוסה בעקיפין:** AD-9 מעביר את כל ערכי DESIGN לטוקנים. אין שלד layout (גובה של viewport, שני אזורים שגוללים בנפרד). | (L) שורה ב-Conventions או ב-Seed: ‏`.app` עם `min-width: var(--spacing-app-min-width)`, ‏grid של `var(--spacing-tree-width) 1fr`, ו-`overflow-y: auto` לכל אזור בנפרד. |
| N11 | הטקסטים של שורות המצב והממשק | EXPERIENCE › Voice and Tone | **נכלל:** ‏`src/core/text.ts`, ושורות `status` ב-`selectVisibleRows`. **חסר (L):** כשהטסטים מייבאים את אותם קבועים, שגיאת כתיב בקבוע לא תיתפס. | טסט אחד שמשווה כל קבוע ב-`text.ts` למחרוזת המילולית מה-PRD (כולל U+2026). |
| N12 | שמות ארוכים: חיתוך עם `…` בעץ ובפס העליון, בלי tooltip. בחלונית השם מלא, עם `overflow-wrap: anywhere` | EXPERIENCE › Bidi | לא מוזכר. זה CSS ונגזר מ-UX, ולכן לא חובה. | (L) לציין שאין מאפיין `title` על שמות. |
| N13 | השורה הנבחרת מוסתרת כשהתיקייה שמעליה נסגרת, אבל הבחירה והפרטים נשארים | EXPERIENCE › State Patterns | נובע מ-AD-3 ומ-FR-3, אבל לא כתוב במפורש. | (L) משפט ב-AD-6/AD-8: ‏`toggle` אף פעם לא משנה את `selectedId`. |
| N14 | FR-1: השורש מוצג פתוח, והתוכן שלו נקרא מיד | FR-1, EXPERIENCE › Open Items | מרומז (`openFolder`), אבל לא כתוב. | (L) לכתוב ש-`openFolder` מוסיף את השורש ל-`expanded` וקורא ל-`listChildren` מיד. |

## 5. פערים טכניים נוספים

| # | חומרה | הממצא | תיקון מוצע |
|---|---|---|---|
| T1 | H | **טיפוסים של TypeScript ל-FSA.** ‏`showDirectoryPicker` לא מופיע ב-`lib.dom.d.ts`. ‏`FileSystemDirectoryHandle.values()` דורש `"DOM.AsyncIterable"` ב-`lib`, ובתבנית של Vite יש רק `DOM` ו-`DOM.Iterable`. בלי זה `tsc -b` ייכשל ב-`fsaSource.ts`. | להוסיף ל-Stack את `@types/wicg-file-system-access` (או `declare` מקומי ב-`src/adapters/`), ולהוסיף ל-`tsconfig.app.json` את `"DOM.AsyncIterable"`. |
| T2 | M | **זיהוי של FR-2.** לא כתוב איך `isSupported` בודק. ה-PRD (§9) רוצה אותה הודעה גם מחוץ ל-secure context. | ‏`typeof window.showDirectoryPicker === 'function'`, שמכסה גם את המקרה של חוסר secure context. |
| T3 | M | **Chrome 133 ומעלה** (בגלל `attr()` עם טיפוס) הוא דרישה חדשה שלא קיימת ב-NFR-1. ב-Chrome 86 עד 132, FR-2 לא יופעל וההזחה תיעלם בשקט. | לכתוב במפורש שזו הרחבה מודעת של NFR-1, או לעבור לחלופה בלי `attr()` עם טיפוס: classes מוגבלים, או custom property שנקבע ב-CSS לפי `[data-depth]`. |
| T4 | L | **ה-hook לא מותקן אוטומטית.** ‏`git config core.hooksPath` הוא צעד ידני, ו-SM-2 תלוי בו. | סקריפט `"prepare": "git config core.hooksPath .githooks"` ב-`package.json`. |
| T5 | L | **מוסכמת שמות לטוקנים.** כתוב רק `--color-*` ו-`--spacing-*`. לא נקבע איך נקראים הטוקנים של `typography.*` (טוקנים מורכבים: family, size, weight, lineHeight, fontStyle) ושל `rounded.*`. | למשל `--typography-body-font-size`, ‏`--typography-status-font-style`, ‏`--rounded-md`. |
| T6 | L | **NFR-4 מעבר לצבעים.** ה-stylelint חוסם צבע ו-`px/rem/em`. ערכים בלי יחידה (`line-height: 1.4`, ‏`font-weight: 500`, ‏`font-style: italic`, ‏`font-family`) מחוץ ל-`tokens.css` לא נחסמים. | ‏`declaration-property-value-allowed-list` שמתיר רק `var(...)` ל-`font-*` ול-`line-height`. או לרשום את זה כמגבלה מודעת. |
| T7 | L | **בדיקה של התמיכה של oxlint.** ‏`react/forbid-dom-props` ו-`no-restricted-imports` עם patterns לכל תיקייה (‏`overrides`) דורשים אימות מול oxlint ‏1.89. | לאמת ב-story הראשון. אם חסר, להשתמש ב-fallback של grep ב-`npm run check`. |
| T8 | L | ב-frontmatter, ‏`sources` לא כולל את ה-brief addendum, אף שה-spine מממש ממנו את `mode: 'read'`, את איסור השמירה של handles ואת ה-fake. | להוסיף. |

## 6. מה שנכלל במלואו (לבדיקה)

FR-1 עד FR-8 ממופים (Capability Map). ‏NFR-1: ‏localhost. ‏NFR-2: ‏Stack. ‏NFR-3: ‏AD-1 ו-AD-10. ‏NFR-4: ‏AD-9 ו-AD-10 (עם הפערים N4–N6 ו-T6). ‏NFR-5: ‏AD-10 ו-AD-11. ‏NFR-6: ‏AD-7 ו-`text.ts`. Deferred תואם ל-PRD §6 ולהערות "הגרסה הבאה" (מצב כהה, תצוגה מקדימה, גרירת רוחב, וירטואליזציה, מקלדת ו-ARIA).

---
name: file-browser
description: דפדפן תיקיות מקומי שקט ל-Chrome בדסקטופ. כל ערכי העיצוב (צבעים, מרווחים, גופנים) מוגדרים כאן, ומכאן נבנה קובץ הטוקנים היחיד של NFR-4.
title: "DESIGN: דפדפן תיקיות מקומי"
status: final
created: 2026-10-22
updated: 2026-10-22
sources:
  - ../../prds/prd-file-browser-bmad-2026-10-22/prd.md
  - ../../prds/prd-file-browser-bmad-2026-10-22/addendum.md
colors:
  # light / dark pairs. V1 ships light only; the -dark values are kept ready for the next version (sun/moon toggle).
  background: '#FFFFFF'
  background-dark: '#212328'
  surface-tree: '#F6F7F8'
  surface-tree-dark: '#1B1D21'
  border: '#E3E5E8'
  border-dark: '#33363C'
  text: '#1D2025'
  text-dark: '#E6E8EB'
  text-muted: '#646B75'
  text-muted-dark: '#9AA1AB'
  accent: '#3B6EA8'
  accent-dark: '#7AA7D9'
  accent-foreground: '#FFFFFF'
  accent-foreground-dark: '#13161A'
  selected: '#D7E3F1'
  selected-dark: '#2B3A4D'
typography:
  # fontStyle is an extension to the spec's key list, needed so italic is a token (NFR-4).
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  small:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  status:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: 12px
    fontWeight: '400'
    fontStyle: italic
    lineHeight: '1.4'
  button:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 4px
  md: 8px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  app-min-width: 640px
  tree-width: 320px
  row-height: 28px
  indent: 20px
  chevron: 14px
  icon: 14px
  icon-stroke: 1.5px
  details-label-width: 80px
  border-width: 1px
  selection-bar: 3px
  focus-ring: 2px
  focus-ring-offset: 2px
  focus-ring-offset-inset: -2px
components:
  app:
    min-width: '{spacing.app-min-width}'
    background: '{colors.background}'
    color-scheme: light
  top-bar:
    background: '{colors.background}'
    border-bottom: '{spacing.border-width} solid {colors.border}'
    padding: '{spacing.2} {spacing.3}'
    gap: '{spacing.3}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    typography: '{typography.button}'
    radius: '{rounded.md}'
    padding: '{spacing.1} {spacing.3}'
    border: none
  root-name:
    foreground: '{colors.text-muted}'
    typography: '{typography.small}'
    overflow: 'single line, ellipsis'
  unsupported-message:
    foreground: '{colors.text}'
    typography: '{typography.body}'
  tree:
    background: '{colors.surface-tree}'
    width: '{spacing.tree-width}'
    border-right: '{spacing.border-width} solid {colors.border}'
    padding-block: '{spacing.2}'
  tree-row:
    height: '{spacing.row-height}'
    indent-per-level: '{spacing.indent}'
    padding-inline: '{spacing.2}'
    gap: '{spacing.1}'
    foreground: '{colors.text}'
    typography: '{typography.body}'
  tree-chevron:
    size: '{spacing.chevron}'
    color: '{colors.text-muted}'
    stroke-width: '{spacing.icon-stroke}'
    glyph: 'inline SVG; points right when closed, down when open'
  tree-icon:
    size: '{spacing.icon}'
    color: '{colors.text-muted}'
    stroke-width: '{spacing.icon-stroke}'
    glyph: 'inline SVG; one folder icon (same open or closed), one file icon'
  tree-name:
    overflow: 'single line, ellipsis, may shrink to the ellipsis alone'
  tree-row-selected:
    background: '{colors.selected}'
    foreground: '{colors.text}'
    icon-color: '{colors.text}'
    chevron-color: '{colors.text}'
    indicator-width: '{spacing.selection-bar}'
    indicator-color: '{colors.accent}'
  status-row:
    foreground: '{colors.text-muted}'
    typography: '{typography.status}'
  unreadable-message:
    foreground: '{colors.text-muted}'
    typography: '{typography.status}'
    margin-inline-start: '{spacing.2}'
  details-panel:
    background: '{colors.background}'
    padding: '{spacing.4} {spacing.5}'
  details-empty:
    foreground: '{colors.text-muted}'
    typography: '{typography.body}'
  details-row:
    label-width: '{spacing.details-label-width}'
    label-color: '{colors.text-muted}'
    value-color: '{colors.text}'
    gap: '{spacing.2} {spacing.3}'
    value-numerals: tabular-nums
  focus-ring:
    width: '{spacing.focus-ring}'
    color: '{colors.accent}'
    offset: '{spacing.focus-ring-offset}'
    offset-in-tree: '{spacing.focus-ring-offset-inset}'
    radius-in-tree: '{rounded.sm}'
---

## Brand & Style

דפדפן התיקיות הוא כלי **שקט שלא מסיח**. העין של Ita צריכה ללכת רק לשני מקומות: לשורה הנבחרת בעץ ולפרטים בחלונית. כל השאר נבלע ברקע. ההתנהגות לקוחה מ-Finder, אבל המראה לא מחקה אותו ולא מחקה שום מערכת הפעלה. המראה ניטרלי: אפורים, צבע הדגשה אחד, פינות רכות ועומק עדין.

**בגרסה הראשונה המוצר תמיד בהיר**, גם כשהמערכת במצב כהה. ערכי הכהה כבר מוגדרים כאן ומוכנים לגרסה הבאה. בגרסה הזו יתווסף גם כפתור שמש/ירח שיחליף בין המצבים. אין גופני web. משתמשים בגופן המובנה של המערכת, שיש בו גם עברית.

הכיוון הוויזואלי נבחר מתוך דף השוואה (`mockups/color-themes-1.html`, כיוון ב'). כל יחסי הניגודיות נמדדו ממנו. אם יש סתירה בין מוקאפ לבין המסמך הזה, המסמך קובע.

## Colors

הפלטה היא אפורים ניטרליים ועוד **צבע הדגשה אחד**. בכל טוקן יש ערך לבהיר וערך לכהה (`X` ו-`X-dark`). **ב-V1 משתמשים רק בערכים הבהירים**, ו-`:root` מקבל `color-scheme: light`. ערכי `-dark` נשמרים לגרסה הבאה. **[NOTE FOR ARCHITECTURE]** אפשרות אחת היא לכתוב כבר עכשיו כל זוג כמשתנה אחד בעזרת `light-dark()` (Chrome 123 ומעלה): כש-`color-scheme: light`, המשתנים תמיד יחזירו את הערך הבהיר, ובגרסה הבאה הכפתור רק יחליף את `color-scheme`. האפשרות השנייה היא להוציא ב-V1 רק את הערכים הבהירים. ההחלטה בשלב הארכיטקטורה. כל ערך שאינו צבע (מידות, גופנים) הוא משתנה אחד, בלי גרסה כהה.

- **`{colors.background}`**: הרקע של הפס העליון ושל חלונית הפרטים.
- **`{colors.surface-tree}`**: הרקע של העץ. כך העץ והחלונית נראים כשני אזורים נפרדים בלי קו חזק.
- **`{colors.border}`**: הקו שמתחת לפס העליון והקו שבין העץ לחלונית.
- **`{colors.text}`**: טקסט רגיל, שמות של פריטים, ערכים בחלונית, הודעת FR-2, והאייקון והחץ של השורה הנבחרת.
- **`{colors.text-muted}`**: תוויות בחלונית, שם תיקיית השורש, אייקונים וחצים, שורות מצב, `Unable to read this item`, והמצב הריק של החלונית.
- **`{colors.accent}`** (כחול-צפחה מעומעם): **רק** בשלושה מקומות: הכפתור הראשי, פס הבחירה, וטבעת ה-focus.
- **`{colors.accent-foreground}`**: הטקסט על הכפתור הראשי.
- **`{colors.selected}`**: רקע עדין לשורה הנבחרת. הוא תמיד מופיע יחד עם הפס, ולעולם לא לבדו.

**ניגודיות (נמדדה לפי WCAG):**

| זוג | בהיר (V1) | כהה (גרסה הבאה) | סף |
|---|---|---|---|
| טקסט על עץ | 15.2 | 13.7 | 4.5 |
| טקסט על רקע | 16.3 | 12.8 | 4.5 |
| טקסט על שורה נבחרת | 12.6 | 9.4 | 4.5 |
| טקסט משני על עץ | 5.0 | 6.5 | 4.5 |
| טקסט משני על רקע | 5.4 | 6.0 | 4.5 |
| טקסט הכפתור על accent | 5.3 | 7.2 | 4.5 |
| פס הבחירה מול העץ | 4.9 | 6.7 | 3 (WCAG 1.4.11) |
| פס הבחירה מול רקע השורה הנבחרת | 4.1 | 4.6 | 3 |
| טבעת focus מול הרקע | 5.3 | 6.3 | 3 |
| טבעת focus מול העץ | 4.9 | 6.7 | 3 |
| טבעת focus מול שורה נבחרת | 4.1 | 4.6 | 3 |
| רקע הבחירה מול העץ | 1.2 | 1.5 | לא נדרש: הפס הוא הסימן |

## Typography

גופן אחד, `system-ui`. יש בו גליפים לעברית, ולכן שם כמו `דוח סופי (2).pdf` לא עובר לגופן גיבוי.

| תפקיד | טוקן | שימוש |
|---|---|---|
| גוף | `{typography.body}` | שמות בעץ, תוויות וערכים בחלונית, הודעת FR-2, המצב הריק של החלונית |
| קטן | `{typography.small}` | שם תיקיית השורש בפס העליון |
| מצב | `{typography.status}` (נטוי) | **רק** שורות מצב בעץ ובחלונית: `Loading…`, `Empty folder`, `Unable to read this item` |
| כפתור | `{typography.button}` | `Open folder…` |

הנטוי שמור לשורות מצב בלבד. המצב הריק של החלונית הוא הנחיה ולא מצב, ולכן הוא באפור רגיל ולא נטוי. הערכים בחלונית מוצגים עם `font-variant-numeric: tabular-nums`.

## Layout & Spacing

סולם הריווח מבוסס על 4px (`{spacing.1}` עד `{spacing.6}`). יש גם טוקנים עם שם, למידות שאינן חלק מהסולם.

```
┌──────────────────────────────────────────────────────────────┐
│ [Open folder…]  course-bmad                       ← top-bar   │
├───────────────────────┬──────────────────────────────────────┤
│ tree                  │ details-panel                        │
│ ▾ [ic] course-bmad    │ Name      report.pdf                 │
│   ▸ [ic] .git         │ Type      PDF                        │
│ ▌   [ic] report.pdf   │ Size      1.5 MB                     │
│                       │ Modified  Oct 22, 2026, 3:20 PM      │
└───────────────────────┴──────────────────────────────────────┘
```

- **האפליקציה:** רוחב מינימלי של `{spacing.app-min-width}`. בחלון צר יותר הדף גולל לרוחב.
- **פס עליון:** תופס את כל הרוחב. בתוכו הכפתור, ואחריו שם השורש. שם השורש תופס את שאר הרוחב ונחתך עם `…`.
- **עץ:** רוחב קבוע `{spacing.tree-width}`. המשתמשת לא יכולה לשנות אותו. העץ גולל לאורך בנפרד מהחלונית.
- **חלונית פרטים:** ממלאת את שאר הרוחב.
- **שורה בעץ:** גובה `{spacing.row-height}`. ההזחה היא `{spacing.indent}` לכל רמה, ומתחילה מ-`{spacing.2}`. מבנה השורה: מקום לחץ (`{spacing.chevron}`), רווח של `{spacing.1}`, אייקון (`{spacing.icon}`), רווח של `{spacing.1}`, שם. לקובץ אין חץ, אבל המקום שלו נשמר ריק.
- **שורת מצב:** באותו גובה ובאותה הזחה כמו ילד ברמה הבאה. המקום של החץ נשמר, ובמקום האייקון מופיע הטקסט.
- **קינון עמוק:** ההזחה לא מוגבלת. כשהיא לא משאירה מקום, השם ממשיך להיחתך, גם עד שנשאר רק `…`. לעץ אין גלילה אופקית (`overflow-x: hidden`), והשם המלא מופיע בחלונית.
- **שם ליד `Unable to read this item`:** ההודעה תמיד מוצגת במלואה, והשם נחתך עם `…` כדי לפנות לה מקום.
- **פרטים:** טבלה של תווית וערך. עמודת התוויות ברוחב `{spacing.details-label-width}`. התוכן, וגם המצב הריק, מתחיל בפינה העליונה השמאלית.

## Elevation & Depth

אין צללים ואין משטחים מוגבהים. החלונית **צמודה** לעץ וממלאת את כל האזור הימני, כמו שה-PRD מתאר. ההפרדה בין שני האזורים נוצרת רק מהרקעים השונים (`{colors.surface-tree}` מול `{colors.background}`) ומקו `{colors.border}`. ההחלטה התקבלה מול המוקאפ (`mockups/key-screens.html`, הגרסה "צמודה"). היא מחליפה את הפירוש של "רך" לגבי החלונית, ולכן הפינות של 8px נשארות רק בכפתור.

## Shapes

- `{rounded.md}`: הכפתור הראשי בלבד. לחלונית אין פינות, כי היא צמודה.
- `{rounded.sm}`: טבעת ה-focus בתוך העץ.
- לשורות בעץ אין פינות. הרקע של השורה הנבחרת מגיע מקצה לקצה של העץ.

## Components

- **`app`:** רוחב מינימלי, ו-`color-scheme: light` (ב-V1 תמיד בהיר). הרקע שלו הוא גם הרקע של האזור הימני.
- **`top-bar`:** קו תחתון בעובי `{spacing.border-width}`.
- **`button-primary`:** רקע `{colors.accent}`, טקסט `{colors.accent-foreground}`, פינות `{rounded.md}`. אין לו מצב hover, ואין עיצוב משלו למצב לחוץ.
- **`root-name`:** אפור, `{typography.small}`, `dir="ltr"` עם `unicode-bidi: isolate`, שורה אחת עם `…`. לפני שנבחרה תיקייה, הוא לא מוצג.
- **`unsupported-message`:** בצבע `{colors.text}` הרגיל, במקום הכפתור.
- **`tree`:** רקע `{colors.surface-tree}` וקו ימני.
- **`tree-row`, `tree-chevron`, `tree-icon`, `tree-name`:** החץ והאייקון באפור, השם בצבע הטקסט, עם `dir="ltr"` ו-`unicode-bidi: isolate`, ונחתך עם `…`. האייקונים והחץ הם SVG פשוט שנכתב בפרויקט עצמו (inline, בלי ספרייה), בקו דק של `{spacing.icon-stroke}` ובצבע `currentColor`. כמו בדף ההשוואה, יש אייקון אחד לתיקייה, אותו אייקון כשהיא פתוחה וכשהיא סגורה, ואייקון אחד לקובץ. החץ מצביע ימינה כשהתיקייה סגורה ולמטה כשהיא פתוחה. אין אנימציה בין שני המצבים.
- **`tree-row-selected`:** רקע `{colors.selected}`, והאייקון והחץ ב-`{colors.text}`. הפס: `box-shadow: inset {indicator-width} 0 0 {indicator-color}`, כדי שלא ישנה את הרוחב.
- **`status-row`:** אפור ונטוי.
- **`unreadable-message`:** באותו סגנון כמו `status-row`, במרחק `{spacing.2}` מהשם. בלי אייקון ובלי צבע מיוחד.
- **`details-panel`, `details-row`:** תוויות אפורות, ערכים בצבע הטקסט, מספרים טבלאיים. כשהפרטים בטעינה, מתחת לשורת `Name` מוצג `Loading…` בסגנון `status-row`.
- **`details-empty`:** `Select a file to see its details` באפור, `{typography.body}`, **לא** נטוי.
- **`focus-ring`:** מופיע רק עם `:focus-visible`. בפס העליון הוא מחוץ לאלמנט (`offset`). בעץ הוא בתוך השורה (`offset-in-tree`, פינות `radius-in-tree`), על הכפתור שנמצא ב-focus: החץ או השם.

## Do's and Don'ts

| כן | לא |
|---|---|
| להשתמש ב-`{colors.accent}` רק לכפתור, לפס הבחירה ולטבעת ה-focus | להשתמש ב-accent לקישורים, לאייקונים או לקישוט |
| לסמן את הפריט הנבחר ברקע **וגם** בפס | לסמן את הבחירה ברקע בלבד |
| נטוי רק בשורות מצב | נטוי בתוויות, בהנחיות או במצב הריק |
| שכל ערך יגיע ממשתנה CSS בקובץ הטוקנים (NFR-4) | ערכים קשיחים, `style={{…}}` inline, או צבע שלא מופיע כאן (גם בצל) |
| `dir="ltr"` + `unicode-bidi: isolate` על כל שם: בעץ, בחלונית ובפס העליון | `dir="auto"` על שמות (הסיומת קופצת שמאלה), או ממשק RTL |
| `system-ui` בלבד | לטעון גופני web |
| V1 תמיד בהיר, וערכי הכהה מוכנים בטוקנים | מצב כהה לפי `prefers-color-scheme`, או מתג, ב-V1 |
| בלי hover ובלי סמן יד | רקע hover "רק קצת" |
| חלונית צמודה, שטוחה | צל, פינות או שוליים סביב החלונית |

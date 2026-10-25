---
paths:
  - "src/**"
---

# סוג קובץ מזהים לפי הסיומת, לא לפי `file.type`

**תאריך:** 2026-10-25 · **מקור:** באג בפרויקט הקודם (`isImage`)

**הכלל:** את סוג הקובץ (תמונה, טקסט, קוד וכו') קובעים לפי הסיומת של השם, ואף פעם לא לפי `file.type` (ה-MIME type שהדפדפן מדווח על `File`/`Blob`). ‏oxlint אוכף את זה: ‏`no-restricted-properties` על `file.type` ועל `blob.type` ב-`src/**`, כך ש-`npm run check` נכשל. החוק מזהה לפי שם המשתנה, ולכן הוא לא מחליף את הכלל. גם משתנה בשם אחר שמחזיק `File` לא קורא ל-`.type`.

**למה:** בפרויקט הקודם, ‏`isImage` בדקה את `file.type`, וזה היה באג. הדפדפן מנחש את ה-MIME מהסיומת לפי טבלה משלו, והניחוש לא אמין. למשל, קובצי `.ts` מסומנים `video/mp2t` (MPEG transport stream), ולכן קוד TypeScript נראה כמו וידאו. עבור סיומת לא מוכרת מתקבלת מחרוזת ריקה, והתוצאה משתנה בין דפדפנים ומערכות הפעלה.

**לא נכון:**
```ts
const file = await handle.getFile();
const isImage = file.type.startsWith('image/');   // a.ts → 'video/mp2t'
```

**נכון:**
```ts
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

const isImage = IMAGE_EXTENSIONS.has(extensionOf(entry.name));
```

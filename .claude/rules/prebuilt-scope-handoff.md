# היקף שנבנה מראש עובר במפורש לסיפור הבא

**תאריך:** 2026-10-23 · **מקור:** רטרוספקטיבה Epic 1, ‏L-2 ו-F-7 (`_bmad-output/implementation-artifacts/epic-1-retro-2026-10-23.md`)

**הכלל:** אם סיפור בונה משהו שבתוכנית שייך לסיפור מאוחר יותר, רושמים את זה ב-Implementation Notes של ה-spec שלו: מה נבנה, באיזה קובץ, ומה עוד חסר. כשמתכננים את הסיפור הבא, ה-Code Map שלו מצטט את זה ואומר במפורש "קיים, לא לבנות מחדש, רק לכסות בטסטים".

**למה:** סיפור 1.1 בנה מראש את `selectVisibleRows` המלא, שורות מצב ושני כפתורים ב-`TreeRow`, שהיו בהיקף של 1.2. זה עבד רק כי ה-Code Map של spec-1-2 גילה את זה ואמר את זה במפורש. בלי זה, 1.2 היה בונה אותו קוד פעם שנייה או שובר אותו.

**לא נכון:**
```md
## Implementation Notes (spec 1.1)
- `npm run check` ירוק.
```

**נכון:**
```md
## Implementation Notes (spec 1.1)
- נבנה מראש מהיקף 1.2: `selectVisibleRows` עם DFS מלא ושורות מצב (`src/lib/selectors.ts`),
  ‏`TreeRow` עם שני כפתורים ו-`data-depth`. חסר ל-1.2: `toggle`, ‏`toggled`/`loadStarted`, טסטים בעומק.

## Code Map (spec 1.2)
- `src/lib/selectors.ts` -- כבר DFS מלא מ-1.1 (ראו Implementation Notes של spec-1-1). לא לשנות, רק לכסות בטסטים.
```

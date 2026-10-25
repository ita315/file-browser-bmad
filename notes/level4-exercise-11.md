# רמה 4 · תרגיל 11: שלוש טעויות שקורות רק פעם אחת

## שלושת הכללים
| # | כלל | קובץ | מאיפה בא | נאכף בבדיקה? |
|---|---|---|---|---|
| 1 | ניסוי ידני שקובע התנהגות נעשה לפני המפרטים | `.claude/rules/manual-spike-before-specs.md` (L-3) | FR-5: התברר רק בסיפור 1.3 ש-chmod 000 לא גורם ל-getFile() להיכשל במק | לא (כלל תהליך) |
| 2 | לסמן כל משימה במפרט ברגע שהיא גמורה | `.claude/rules/spec-records-progress.md` (L-4) | מגבלת השימוש עצרה את הבנייה של 1.3 באמצע | לא (כלל תהליך) |
| 3 | סוג קובץ לפי הסיומת, אף פעם לא לפי file.type | `.claude/rules/file-type-by-extension.md` (paths: src/**) | הבאג isImage בפרויקט הקודם (file-browser) | כן: oxlint no-restricted-properties ב-.oxlintrc.json |

בכל כלל: תאריך, סיבה, ודוגמה של לא נכון / נכון.

## ההוכחה שכלל 3 נאכף
1. לפני השינוי: npm run check ירוק, 134 טסטים
2. קובץ זמני עם file.type.startsWith('image/'): npm run check נכשל (exit 1):
   error eslint(no-restricted-properties): 'file.type' is restricted from being used.
3. אחרי מחיקת הקובץ: שוב ירוק, 134 טסטים

מגבלה ידועה: ה-lint מזהה לפי שם המשתנה (file, blob), ולא לפי הטיפוס. f.type לא ייתפס. לכן הכלל הכתוב עדיין נחוץ.

## סשן חדש מקיים את הכלל בלי שאמרו לו
הבקשה (בלי להזכיר את הכלל):
> Answer only, don't edit any files: in the details panel I want to show "Image: yes" when the selected file is an image. Show me exactly the code you'd write to decide whether a file is an image.

קטע מהתשובה:
```ts
/** By extension only, never `file.type` (see .claude/rules/file-type-by-extension.md). */
export function isImage(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}
```
> It checks the file name, not file.type. That's the project rule from b1b406f. The browser's MIME guess is unreliable (for example, .ts files are reported as video/mp2t), and oxlint will fail npm run check if code reads file.type.

הכלל נטען לבד, כי הסוכן קרא קובץ ב-src/ (בזכות paths: src/**), והשפיע על ההחלטה.

## מה למדתי
- כלל = מסקנה שנכתבה במקום שכל סוכן קורא לבד, בכל סשן
- כלל כתוב + בדיקה אוטומטית = שתי שכבות הגנה. לכל אחת חור, ויחד הן חזקות
- טעות מפרויקט אחד יכולה להגן על פרויקט אחר (Compounding בין פרויקטים)
- paths: חוסך טוקנים: הכלל נטען רק כשנוגעים בקוד

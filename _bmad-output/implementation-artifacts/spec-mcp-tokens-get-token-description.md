---
title: 'ה-description של get_token: מתי להשתמש בו'
type: 'bugfix'
created: '2026-10-29'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-mcp-tokens/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-mcp-tokens/stack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** בבדיקה הידנית של spec-mcp-tokens, ‏Claude לא השתמש ב-`get_token` וקרא ישירות את `tokens.css`. ה-description אומר להשתמש בכלי "לפני שכותבים ערך עיצובי ב-CSS", אבל כשכותבים CSS צריך רק את שם הטוקן, לא את הערך שלו, ולכן הטריגר לא מתאים לאף מצב אמיתי.

**Approach:** לשנות את ה-description כך שיגיד להשתמש ב-`get_token` בכל פעם שצריך לדעת את הערך של טוקן, למשל כשעונים על שאלה כמו "כמה מעוגלות הפינות של כפתור", ושעדיף אותו על קריאה ישירה של `tokens.css`. לעדכן באותו נוסח את האילוץ ב-`SPEC.md` ואת `stack.md`.

</frozen-after-approval>

## Implementation Notes

- `mcp_servers/design-tokens/server.ts`: המשפט "Use it before writing any design value … in CSS" הוחלף ב-"Use it whenever you need to know a token's value, e.g. to answer \"how rounded are button corners?\"" (הדוגמה הוחלפה אחרי ה-review, ראו ממצא 1). גם המשפט על AD-9 ("every design value in this project must come from a token") הוסר, כי הוא היה ההצדקה לטריגר של כתיבת CSS ומשך את המודל שוב לאותו מצב. המשפטים על העדיפות מול `tokens.css` ועל הדוגמאות נשארו.
- `mcp_servers/design-tokens/server.test.ts`: הטסט "tells the model when to use it" בודק עכשיו את הנוסח החדש.
- `SPEC.md` (אילוץ ה-description) ו-`stack.md` (שורת ה-tool בטבלה) עודכנו לאותו נוסח.
- לא נגעתי ב-`spec-mcp-tokens.md` (spec בסטטוס done, תיעוד היסטורי) וב-`.memlog.md` (יומן של bmad-spec).
- `npm run check` ירוק, 158 טסטים.

## Review Triage Log

| # | ממצא | verdict | ראיה / החלטה |
|---|---|---|---|
| 1 | הדוגמה ב-description זהה לשאלה של בדיקה ידנית 3 ב-`stack.md` | medium | נכון: בדיקה 3 כבר לא מראה שהמודל בחר לבד. ‏Ita החליטה להחליף את הדוגמה ב-"how rounded are button corners?" ולהשאיר את בדיקה 3 כמו שהיא. ‏patch ב-server.ts, ‏SPEC.md, ‏stack.md וב-Intent |
| 2 | ה-description לא אומר איך מוצאים את שם הטוקן | maybe-false | ‏`get_token` מקבל רק שם מדויק; אפשר למצוא אותו ב-`app.css`. ‏defer |
| 3 | ‏Why ב-SPEC.md עדיין מדבר על מודל שכותב CSS | low | ה-prompt ‏`style-with-tokens` עדיין מכסה את המקרה הזה, כך שה-Why נשאר נכון. נדחה |
| 4 | ‏`.memlog.md:30` עם הנוסח הישן | low | נכון, אבל זה עריכה של spec שלא התבקשה. ‏defer |
| 5 | אין Tasks & Acceptance | false | במסלול oneshot התבנית מוחקת את הסעיף |
| 6 | אין Verification או הרצה חוזרת של בדיקה 3 | low | נכון שהבדיקה הידנית צריכה לרוץ שוב. זה יופיע בסיכום ל-Ita, בלי שינוי ב-spec |
| 7 | הטסט לא מוודא שהנוסח הישן הוסר | low | ‏patch: נוסף `not.toContain('before writing')` |
| 8 | ‏"בלי זה המודל לא יבחר" ב-SPEC.md | low | בלי טריגר מפורש המודל באמת לא יבחר; הטענה עדיין נכונה. נדחה |


---
name: review-change
description: בודק שינוי בקבצים מסוימים מול AD-1 עד AD-11 ומול הכללים ב-.claude/rules/, ומחזיר CLEAN או רשימת הפרות.
argument-hint: <files>
context: fork
agent: rules-reviewer
disable-model-invocation: true
allowed-tools: Bash(git diff *)
---

## השינוי

הקבצים לבדיקה: $ARGUMENTS

!`git diff HEAD -- $ARGUMENTS`

## הליך הבדיקה

1. בדוק את השורות שהשתנו ב-diff מול AD-1 עד AD-11 ב-`ARCHITECTURE-SPINE.md` ומול הכללים ב-`.claude/rules/`.
2. מותר לקרוא את הקבצים המלאים רק כדי להבין את ההקשר.
3. מה שנדחה ב-triage עם נימוק לא נחשב הפרה.
4. אם ה-diff ריק, אמור את זה ובדוק את הקבצים המלאים.

## פלט

עד 10 שורות:
- אם אין הפרות: `CLEAN`
- אם יש הפרות, שורה לכל הפרה: `קובץ:שורה | הכלל | הצעה לתיקון`

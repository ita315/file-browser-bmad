# ממצאי review שכבר נדחו לא עולים שוב

**תאריך:** 2026-10-23 · **מקור:** רטרוספקטיבה Epic 1, ‏L-1 (`_bmad-output/implementation-artifacts/epic-1-retro-2026-10-23.md`)

**הכלל:** לפני שמריצים review בסיפור (שלב 4 של bmad-build), אוספים מה-Review Triage Log של ה-specs הקודמים באותו אפוס את הממצאים שנדחו עם נימוק, ומעבירים אותם ל-reviewers כרשימת "נדחה, לא להעלות שוב". ממצא מהרשימה עולה מחדש רק אם הקוד השתנה כך שהנימוק כבר לא נכון.

**למה:** ה-review בשלוש שכבות תפס באגים אמיתיים בכל סיפור, אבל אותם ממצאים נדחו שוב ושוב: listener שזורק (1.1 #9, ‏1.2 #5, ‏1.3 #7), ‏`attr()` של Chrome 133+ (1.1 #12, ‏1.2 #7), ‏ARIA (1.1 #19, ‏1.2 #3). כל אחד מהם עלה זמן triage בלי לשנות שום דבר.

**לא נכון:**
```
Review prompt: "Review the diff for story 1.3."
→ #7: "listener שזורק ב-subscribe עוצר את שאר ה-listeners" — נדחה (כמו ב-1.1 וב-1.2)
```

**נכון:**
```
Review prompt: "Review the diff for story 1.3.
Already rejected in this epic (do not re-raise unless the code changed the premise):
- throwing listener (1.1 #9) — the only listeners are useSyncExternalStore's; no path shown where they throw
- typed attr() without fallback (1.1 #12) — the Stack requires Chrome 133+
- ARIA/keyboard beyond native elements (1.1 #19) — deferred in the spine
- AbortController for the old root's read (1.1 #10) — spine Deferred; the result is dropped in the reducer"
```

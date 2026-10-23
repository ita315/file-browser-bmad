# ה-spec מתעד התקדמות כדי שאפשר יהיה להמשיך בנייה שנקטעה

**תאריך:** 2026-10-23 · **מקור:** רטרוספקטיבה Epic 1, ‏L-4 (`_bmad-output/implementation-artifacts/epic-1-retro-2026-10-23.md`)

**הכלל:** בזמן המימוש (bmad-build שלב 3), כל משימה שהושלמה מסומנת `[x]` ב-Tasks של ה-spec מיד כשהיא גמורה, ולא רק בסוף. אם הבנייה נקטעת (מגבלת שימוש, subagent שנפל), ממשיכים מה-spec: קוראים מה מסומן, מריצים `npm run check`, ומשלימים רק את מה שלא סומן. לא מתחילים מחדש ולא מניחים מהזיכרון מה נעשה.

**למה:** המימוש של 1.3 נקטע באמצע בגלל מגבלת שימוש. ההמשך הצליח בלי לעשות עבודה פעמיים, כי ה-spec אמר מה כבר נכתב (הקוד וטסטי ה-controller) ומה חסר (טסטי reducer/selectors ו-RTL).

**לא נכון:**
```md
## Tasks & Acceptance
- [ ] `src/lib/controller.ts` -- `select`
- [ ] `src/lib/selectors.test.ts` -- ...
<!-- הקוד של controller כבר כתוב, אבל שום דבר לא מסומן; הסשן הבא לא יודע מאיפה להמשיך -->
```

**נכון:**
```md
## Tasks & Acceptance
- [x] `src/lib/controller.ts` -- `select`
- [x] `src/lib/controller.test.ts` -- AC-1, AC-5..AC-10
- [ ] `src/lib/selectors.test.ts` -- `selectDetails` <!-- כאן ממשיכים -->
```

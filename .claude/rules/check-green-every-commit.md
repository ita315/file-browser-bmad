# ‏`npm run check` ירוק בכל commit, בלי לעקוף את ה-hook

**תאריך:** 2026-10-23 · **מקור:** רטרוספקטיבה Epic 1, ‏L-5 (`_bmad-output/implementation-artifacts/epic-1-retro-2026-10-23.md`)

**הכלל:** כל commit עובר דרך ה-pre-commit hook ב-`.githooks`, שמריץ `npm run check` (tsc, ‏oxlint, ‏stylelint, ‏vitest). אסור `git commit --no-verify`, אסור לשנות את `core.hooksPath`, ואסור לכבות חוק lint או לסמן טסט `skip` כדי לעבור. אם הבדיקה אדומה, מתקנים את הקוד. אם אי אפשר, עוצרים ושואלים את Ita.

**למה:** בשלושת ה-commits של Epic 1, ‏`npm run check` היה ירוק (44, ‏75 ו-134 טסטים, נבדק בנפרד על כל commit). זה מה שאיפשר לרטרוספקטיבה לאשר את NFR-5 על סמך ראיות, ולא על סמך הבטחה.

**לא נכון:**
```sh
npm run check   # oxlint: 1 warning
git commit --no-verify -m "feat(story-1.4): ..."
```

**נכון:**
```sh
npm run check   # oxlint: 1 warning → מתקנים את הקוד
npm run check   # ירוק
git commit -m "feat(story-1.4): ..."   # ה-hook מריץ שוב ועובר
```

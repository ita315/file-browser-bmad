#!/usr/bin/env node
// Stop hook: לפני ש-Claude מסיים, אם יש שינויים לא שמורים, מריץ `npm run check`.
// אדום -> חוסם פעם אחת ומחזיר ל-Claude את סוף הפלט. אדום שוב -> מאפשר לעצור ומציג לך הודעה.
// כל תקלה בסקריפט עצמו -> exit 0, כדי לא לתקוע את הסשן.
import { spawnSync } from "node:child_process";
import { stripVTControlCharacters } from "node:util";

const MAX_LINES = 60;
const MAX_CHARS = 4000;
const CHECK_TIMEOUT_MS = 4 * 60 * 1000;

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

// סוף הפלט בלבד: בלי צבעי ANSI, בלי שורות ריקות, חתוך לגודל סביר.
function tailOf(output) {
  const clean = stripVTControlCharacters(output);
  const lines = clean.split("\n").filter((line) => line.trim() !== "");
  let tail = lines.slice(-MAX_LINES).join("\n");
  if (tail.length > MAX_CHARS) tail = "…" + tail.slice(-MAX_CHARS);
  return tail;
}

function main(input) {
  const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

  // 1. אין שינויים -> לא מריצים בדיקה.
  const status = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
  if (status.error || status.status !== 0) return; // git נכשל: לא תוקעים את הסשן
  if (status.stdout.trim() === "") return;

  // 2. יש שינויים -> npm run check.
  const check = spawnSync("npm", ["run", "check"], {
    cwd,
    encoding: "utf8",
    timeout: CHECK_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  if (check.error) return; // לא הצלחנו להריץ (או timeout): זו תקלה בסקריפט, לא בקוד
  if (check.status === 0) return; // ירוק

  const tail = tailOf(`${check.stdout ?? ""}\n${check.stderr ?? ""}`);

  if (input.stop_hook_active !== true) {
    // 3. אדום, חסימה ראשונה: decision=block + reason, ב-exit 0. Claude ממשיך ומקבל את ה-reason.
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason:
          "`npm run check` נכשל. תקן את הכשלים לפני שאתה מסיים, ואז הרץ `npm run check` שוב. " +
          "אסור לעקוף עם --no-verify, לכבות חוק lint או לסמן טסט skip.\n\n" +
          `סוף הפלט:\n${tail}`,
      }),
    );
    return;
  }

  // 4. אדום ו-stop_hook_active=true: לא חוסמים שוב (מונע לולאה).
  // systemMessage מוצג למשתמש בטרמינל, ו-Claude מורשה לעצור.
  process.stdout.write(
    JSON.stringify({
      systemMessage:
        "⚠️ stop-gate: `npm run check` עדיין אדום, ו-Claude עצר אחרי ניסיון תיקון אחד. " +
        `צריך לטפל בזה ידנית לפני commit.\n\n${tail}`,
    }),
  );
}

try {
  const raw = await readStdin();
  let input = {};
  try {
    input = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    input = {};
  }
  main(input);
} catch {
  // כל תקלה בסקריפט עצמו: לא תוקעים את הסשן
}
process.exit(0);

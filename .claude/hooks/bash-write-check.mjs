#!/usr/bin/env node
// Feedback hook for the Bash tool, one script for two events (by hook_event_name):
//   PreToolUse   -> snapshot of the files git reports (git status --porcelain, new files included),
//                   with a content hash per file, saved to logs/bash-write-check-<tool_use_id>.json. Always exit 0.
//   PostToolUse  -> snapshot again and compare. A file added, deleted or with a changed hash (outside logs/)
//                   -> stderr with the list and exit 2. Otherwise exit 0. The snapshot file is deleted afterwards.
// This is feedback, not a guard: any problem (no git, no snapshot, broken input) exits 0 silently.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MISSING = 'missing';
const UNREADABLE = 'unreadable';

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error('git failed');
  return r.stdout;
}

function hashOf(abs) {
  try {
    return createHash('sha256').update(readFileSync(abs)).digest('hex');
  } catch (err) {
    return err?.code === 'ENOENT' ? MISSING : UNREADABLE;
  }
}

// { "<path relative to repo root>": { hash, untracked } } for every file git lists, except logs/.
function takeSnapshot(cwd) {
  const root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  // -z: paths are NUL-separated and unquoted. -uall: list every new file, not just the new directory.
  const fields = git(cwd, ['status', '--porcelain', '-z', '-uall']).split('\0');
  const files = {};
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    if (entry.length < 4) continue;
    const xy = entry.slice(0, 2);
    const rel = entry.slice(3);
    if (xy[0] === 'R' || xy[0] === 'C') i++; // a rename/copy is followed by the old path: skip it
    if (rel === 'logs' || rel.startsWith('logs/')) continue;
    files[rel] = { hash: hashOf(path.join(root, rel)), untracked: xy === '??' };
  }
  return files;
}

function compare(before, after, root) {
  const added = [];
  const deleted = [];
  const changed = [];
  for (const rel of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[rel];
    // A file git no longer lists (e.g. reverted) still needs its current state.
    const a = after[rel] ?? { hash: hashOf(path.join(root, rel)), untracked: false };
    if (b && b.hash === a.hash) continue;
    if (a.hash === MISSING) deleted.push(rel);
    else if (a.untracked && !b) added.push(rel);
    else changed.push(rel);
  }
  return { added, deleted, changed };
}

let report = null;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (input?.tool_name === 'Bash' && typeof input.tool_use_id === 'string') {
    const cwd = path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    const logDir = path.join(cwd, 'logs');
    const id = input.tool_use_id.replace(/[^A-Za-z0-9_-]/g, '_');
    const snapshotFile = path.join(logDir, `bash-write-check-${id}.json`);

    if (input.hook_event_name === 'PreToolUse') {
      const snapshot = takeSnapshot(cwd);
      mkdirSync(logDir, { recursive: true });
      writeFileSync(snapshotFile, JSON.stringify(snapshot));
    } else if (input.hook_event_name === 'PostToolUse') {
      const before = JSON.parse(readFileSync(snapshotFile, 'utf8'));
      try {
        unlinkSync(snapshotFile);
      } catch {
        // already gone: fine
      }
      const root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
      const { added, deleted, changed } = compare(before, takeSnapshot(cwd), root);
      if (added.length + deleted.length + changed.length > 0) {
        const lines = [
          ...added.map((f) => `  נוסף: ${f}`),
          ...deleted.map((f) => `  נמחק: ${f}`),
          ...changed.map((f) => `  השתנה: ${f}`),
        ];
        report =
          'bash-write-check: פקודת Bash שינתה קבצים בפרויקט:\n' +
          lines.join('\n') +
          '\nבפרויקט הזה עורכים קבצים רק עם Edit/Write, לא דרך Bash או סקריפטים. ' +
          'אם השינוי היה מכוון, דווח על זה לאיטה.\n';
      }
    }
  }
} catch {
  // Feedback only: no git, no snapshot, broken input -> silent exit 0.
}

if (report) {
  process.stderr.write(report);
  process.exit(2);
}
process.exit(0);

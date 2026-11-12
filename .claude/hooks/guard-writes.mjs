#!/usr/bin/env node
// PreToolUse hook for Edit and Write: refuses writes to protected paths.
import { readFileSync } from 'node:fs';
import path from 'node:path';

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }) + '\n',
  );
  process.exit(0);
}

function toProjectRelative(filePath) {
  const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const abs = path.resolve(projectDir, filePath); // handles absolute paths and ../
  return path.relative(projectDir, abs).split(path.sep).join('/');
}

function protectedReason(rel) {
  if (rel === '..' || rel.startsWith('../') || path.isAbsolute(rel)) {
    return 'Blocked: path is outside the project.';
  }
  const lower = rel.toLowerCase(); // macOS is case-insensitive
  const base = lower.split('/').pop();
  if (base === '.env' || base.startsWith('.env.')) {
    return 'Writing .env files is blocked: they hold secrets.';
  }
  if (lower === '.claude/settings.json') {
    return 'Editing .claude/settings.json is blocked: it controls the harness.';
  }
  if (lower === 'dist' || lower.startsWith('dist/')) {
    return 'Writing to dist/ is blocked: it is build output.';
  }
  return null;
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath === '') {
    deny('Blocked: missing tool_input.file_path (fail closed).');
  }
  const reason = protectedReason(toProjectRelative(filePath));
  if (reason) deny(reason);
  process.exit(0);
} catch {
  deny('Blocked: could not parse hook input (fail closed).');
}

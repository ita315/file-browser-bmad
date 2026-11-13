#!/usr/bin/env node
// Audit hook for several events (SessionStart, PostToolUse, ...): appends one JSON line to
// logs/agent-audit-YYYY-MM.jsonl (UTC month). Never blocks: any error is swallowed and the exit code is always 0.
// Never logs file contents: only the path for file tools, a shortened command for Bash.
import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';

const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const MAX_COMMAND = 200;

function targetOf(tool, input) {
  if (!input || typeof input !== 'object') return null;
  if (FILE_TOOLS.has(tool)) {
    const p = input.file_path ?? input.notebook_path;
    return typeof p === 'string' ? p : null;
  }
  if (tool === 'Bash') {
    return typeof input.command === 'string' ? input.command.slice(0, MAX_COMMAND) : null;
  }
  return null;
}

try {
  const data = JSON.parse(readFileSync(0, 'utf8'));
  const tool = typeof data.tool_name === 'string' ? data.tool_name : null;
  const now = new Date();
  const entry = {
    ts: now.toISOString(),
    session: data.session_id ?? null,
    event: data.hook_event_name ?? null,
    tool,
    target: targetOf(tool, data.tool_input),
  };
  const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const logDir = path.join(projectDir, 'logs');
  mkdirSync(logDir, { recursive: true });
  // One file per UTC month. Append only: this script never deletes or rotates files.
  const month = now.toISOString().slice(0, 7);
  appendFileSync(path.join(logDir, `agent-audit-${month}.jsonl`), JSON.stringify(entry) + '\n');
} catch {
  // Swallowed on purpose: an audit log must never get in the agent's way.
}
process.exit(0);

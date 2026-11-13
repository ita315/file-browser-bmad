#!/usr/bin/env node
// PostToolUse hook for Edit and Write: feedback when a UI component hardcodes user-facing text
// instead of taking it from src/lib/text.ts (Consistency Conventions, "טקסטים בממשק").
// This is feedback, not a guard: any problem reading or parsing the file exits 0.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TEXT_ATTRIBUTES = new Set(['title', 'aria-label', 'placeholder', 'alt']);
const HAS_LETTERS = /[A-Za-z]{2}/;

function projectRelative(filePath) {
  const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const abs = path.resolve(projectDir, filePath); // absolute or relative input
  return { abs, rel: path.relative(projectDir, abs).split(path.sep).join('/') };
}

// Path gate first: nothing else is read or loaded for other files.
function isCheckedPath(rel) {
  return rel.startsWith('src/ui/') && rel.endsWith('.tsx') && !/\.test\.tsx$/.test(rel);
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function findViolations(ts, abs, source) {
  const sf = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  const report = (pos, text) => {
    const { line } = sf.getLineAndCharacterOfPosition(pos);
    found.push({ line: line + 1, text: collapse(text) });
  };

  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.JsxText) {
      const text = node.text.replace(/&[A-Za-z#0-9]+;/g, ' '); // &nbsp; and friends are not words
      if (HAS_LETTERS.test(text)) {
        const lead = node.text.length - node.text.trimStart().length;
        report(node.pos + lead, node.text);
      }
    } else if (ts.isJsxAttribute(node)) {
      // Only a plain string literal: anything inside {…} is deliberately not checked.
      if (
        ts.isIdentifier(node.name) &&
        TEXT_ATTRIBUTES.has(node.name.text) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        HAS_LETTERS.test(node.initializer.text)
      ) {
        report(node.getStart(sf), `${node.name.text}="${node.initializer.text}"`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath === '') process.exit(0);

  const { abs, rel } = projectRelative(filePath);
  if (!isCheckedPath(rel)) process.exit(0);

  const source = readFileSync(abs, 'utf8');
  const ts = (await import('typescript')).default;
  const violations = findViolations(ts, abs, source);

  if (violations.length > 0) {
    const lines = violations.map((v) => `${rel}:${v.line}: "${v.text}"`);
    process.stderr.write(
      `Hardcoded UI text in ${rel}:\n` +
        lines.map((l) => `  ${l}`).join('\n') +
        '\nMove these strings to src/lib/text.ts as TEXT constants and use them here ' +
        '(Consistency Conventions: UI text lives only in text.ts).\n',
    );
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0); // cannot read or parse: tsc will catch syntax errors
}

export const meta = {
  name: 'ui-text-sweep',
  description: 'Find user-visible text hardcoded in src/ui/*.tsx instead of coming from TEXT in src/lib/text.ts',
  phases: [
    { title: 'List', detail: 'Glob the component files (no test files)', model: 'haiku' },
    { title: 'Scan', detail: 'one reviewer per file looks for hardcoded text', model: 'haiku' },
    { title: 'Verify', detail: 'one skeptic per finding tries to refute it', model: 'sonnet' },
    { title: 'Report', detail: 'plain JavaScript table, no agent' },
  ],
}

const FILES_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
  },
  required: ['files'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          text: { type: 'string' },
        },
        required: ['file', 'line', 'text'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted'] },
    reason: { type: 'string' },
  },
  required: ['verdict', 'reason'],
}

// List
phase('List')
const listed = await agent(
  'Use the Glob tool with the pattern "src/ui/*.tsx" to find the component files. ' +
    'Exclude test files (names ending in .test.tsx). Do not write the list by hand: ' +
    'return exactly the paths Glob returned, minus the test files.',
  { label: 'list-files', phase: 'List', model: 'haiku', effort: 'low', schema: FILES_SCHEMA },
)
const files = ((listed && listed.files) || []).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
log(`${files.length} files to scan`)

// Scan
phase('Scan')
const scanned = await parallel(
  files.map(file => () =>
    agent(
      `Read ${file}. Question: does it contain text that the user sees on screen that is written directly in the code ` +
        'instead of coming from TEXT in src/lib/text.ts? Examples: JSX text, title/aria-label/placeholder/alt attributes ' +
        'with string literals, string literals rendered as content. Read src/lib/text.ts to know what TEXT already covers. ' +
        'Return every suspected place as {file, line, text}. Return an empty list if there are none. ' +
        'Do not report text that comes from TEXT.',
      {
        label: `scan:${file}`,
        phase: 'Scan',
        agentType: 'rules-reviewer',
        model: 'haiku',
        effort: 'low',
        schema: FINDINGS_SCHEMA,
      },
    ),
  ),
)
const findings = scanned.filter(Boolean).flatMap(r => r.findings || [])
log(`${findings.length} suspected findings`)

// Verify
phase('Verify')
const verified = await pipeline(findings, async f => {
  const v = await agent(
    `You are a skeptic. A scanner claims that ${f.file}:${f.line} contains user-visible text hardcoded in the code, ` +
      `instead of coming from TEXT in src/lib/text.ts. The text: ${JSON.stringify(f.text)}. ` +
      'Read the file and try to REFUTE the claim. Check for example: is it a comment, a className or CSS value, ' +
      'a value that is never displayed (key, id, data attribute, type), or does it in fact come from TEXT? ' +
      'Answer "refuted" if you found a reason, "confirmed" only if the text really reaches the user from the code. ' +
      'Give a short reason.',
    {
      label: `verify:${f.file}:${f.line}`,
      phase: 'Verify',
      agentType: 'rules-reviewer',
      model: 'sonnet',
      effort: 'low',
      schema: VERDICT_SCHEMA,
    },
  )
  return { ...f, verdict: v.verdict, reason: v.reason }
})
const rows = verified.filter(Boolean)
if (rows.length < findings.length) log(`${findings.length - rows.length} findings dropped (verifier failed)`)

// Report
phase('Report')
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const table = [
  '| file | line | text | verdict | reason |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(r => `| ${cell(r.file)} | ${r.line} | ${cell(r.text)} | ${r.verdict} | ${cell(r.reason)} |`),
].join('\n')

return {
  scanned: files.length,
  suspected: findings.length,
  confirmed: rows.filter(r => r.verdict === 'confirmed').length,
  table,
}

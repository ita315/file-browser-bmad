// MCP server for the design tokens in src/ui/tokens.css (AD-9).
// Read-only. stdout belongs to the protocol; every log goes to stderr.
// Runs with `node --experimental-strip-types`, so only erasable TypeScript here.

import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { CSS_FILE, TOKEN_NAME, findToken, parseTokens, type Token } from './tokens.ts'

export type LoadCss = () => Promise<string>

const DEFAULT_TOKENS_FILE = 'src/ui/tokens.css'
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/** `TOKENS_FILE` (default `src/ui/tokens.css`); a relative path resolves against the project root, not the cwd. */
export function resolveTokensFile(env: NodeJS.ProcessEnv = process.env): string {
  const file = env.TOKENS_FILE || DEFAULT_TOKENS_FILE
  return isAbsolute(file) ? file : resolve(PROJECT_ROOT, file)
}

/** Reads the file again on every call: no cache. */
export const loadTokensFile: LoadCss = async () => {
  const file = resolveTokensFile()
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    throw new Error(`Cannot read tokens file ${file}: ${messageOf(error)}`, { cause: error })
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function formatTokenList(tokens: readonly Token[]): string {
  return tokens.map((token) => `${token.name}: ${token.value}`).join('\n')
}

export function createServer(loadCss: LoadCss = loadTokensFile): McpServer {
  const server = new McpServer({ name: 'design-tokens', version: '1.0.0' })

  server.registerTool(
    'get_token',
    {
      title: 'Get design token',
      description:
        'Returns the value of one design token from the project\'s src/ui/tokens.css. ' +
        'Use it whenever you need to know a token\'s value, ' +
        'e.g. to answer "how rounded are button corners?". ' +
        'Prefer this tool over reading tokens.css directly. ' +
        'Pass the full custom-property name, e.g. "--color-accent" or "--spacing-2".',
      inputSchema: {
        name: z.string().regex(TOKEN_NAME).describe('Custom-property name, e.g. --color-accent'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name }) => {
      let css: string
      try {
        css = await loadCss()
      } catch (error) {
        console.error(`design-tokens: ${messageOf(error)}`)
        return { isError: true, content: [{ type: 'text', text: messageOf(error) }] }
      }
      const token = findToken(parseTokens(css), name)
      if (token === undefined) {
        return { isError: true, content: [{ type: 'text', text: `Token ${name} not found` }] }
      }
      return { content: [{ type: 'text', text: token.value }] }
    },
  )

  server.registerResource(
    'all-tokens',
    'tokens://all',
    {
      title: 'All design tokens',
      description: 'Every token in src/ui/tokens.css as JSON: [{ name, value, category }].',
      mimeType: 'application/json',
    },
    async (uri) => {
      const tokens = parseTokens(await loadCss())
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(tokens, null, 2) }],
      }
    },
  )

  server.registerPrompt(
    'style-with-tokens',
    {
      title: 'Style with tokens',
      description: 'Replace literal design values in a CSS file with var(--…) tokens (AD-9).',
      argsSchema: {
        file: z.string().regex(CSS_FILE).describe('A CSS file under src/, e.g. src/ui/app.css'),
      },
    },
    async ({ file }) => {
      const tokens = parseTokens(await loadCss())
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Rewrite ${file} so that every literal design value (color, font, size, spacing, radius) ` +
                'is replaced with var(--…) of the matching token. AD-9: every design value comes from ' +
                'src/ui/tokens.css, which is the only file allowed to hold literal values. ' +
                'When several tokens share a value (e.g. 8px is both --spacing-2 and --rounded-md), choose the token ' +
                'by the CSS property\'s category and meaning, not by value alone; if it is still ambiguous, list the value ' +
                'at the end instead of guessing. ' +
                'If no token matches a value, leave it and list it at the end instead of inventing a token. ' +
                'Do not change src/ui/tokens.css itself.\n\n' +
                `Tokens:\n${formatTokenList(tokens)}`,
            },
          },
        ],
      }
    },
  )

  return server
}

if (import.meta.main) {
  const server = createServer()
  await server.connect(new StdioServerTransport())
  console.error(`design-tokens: serving ${resolveTokensFile()} over stdio`)
}

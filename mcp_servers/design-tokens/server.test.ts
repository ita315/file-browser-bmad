// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, loadTokensFile, resolveTokensFile, type LoadCss } from './server.ts'

const css = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8')
const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

let client: Client | undefined

async function connect(loadCss: LoadCss): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await createServer(loadCss).connect(serverTransport)
  client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return client
}

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text: string }[]
  return content.map((part) => part.text).join('')
}

afterEach(async () => {
  await client?.close()
  client = undefined
  vi.unstubAllEnvs()
})

describe('get_token', () => {
  it('returns the value of an existing token', async () => {
    const c = await connect(async () => css)
    const result = await c.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
    expect(result.isError).toBeFalsy()
    expect(textOf(result)).toBe('#3B6EA8')
  })

  it('rejects an invalid name in the schema, before the handler runs', async () => {
    const loadCss = vi.fn(async () => css)
    const c = await connect(loadCss)
    const result = await c.callTool({ name: 'get_token', arguments: { name: 'color-accent' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('Input validation error')
    expect(loadCss).not.toHaveBeenCalled()
  })

  it('returns "not found" from the handler for an unknown name', async () => {
    const loadCss = vi.fn(async () => css)
    const c = await connect(loadCss)
    const result = await c.callTool({ name: 'get_token', arguments: { name: '--color-nope' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('not found')
    expect(textOf(result)).toContain('--color-nope')
    expect(loadCss).toHaveBeenCalledTimes(1)
  })

  it('reads the file again on every call', async () => {
    const loadCss = vi.fn(async () => css)
    const c = await connect(loadCss)
    await c.callTool({ name: 'get_token', arguments: { name: '--spacing-2' } })
    await c.callTool({ name: 'get_token', arguments: { name: '--spacing-2' } })
    expect(loadCss).toHaveBeenCalledTimes(2)
  })

  it('returns isError when loadCss throws, and the server keeps answering', async () => {
    const c = await connect(async () => {
      throw new Error('Cannot read tokens file /nope: ENOENT')
    })
    const result = await c.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('/nope')
    const { tools } = await c.listTools()
    expect(tools.map((tool) => tool.name)).toEqual(['get_token'])
  })

  it('reports the missing path through the real loader (TOKENS_FILE=/nope)', async () => {
    vi.stubEnv('TOKENS_FILE', '/nope')
    const c = await connect(loadTokensFile)
    const result = await c.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('/nope')
  })

  it('reads the real file again on every call (no cache in loadTokensFile)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'design-tokens-'))
    const file = join(dir, 'tokens.css')
    try {
      writeFileSync(file, ':root { --color-accent: #111111; }')
      vi.stubEnv('TOKENS_FILE', file)
      const c = await connect(loadTokensFile)
      const first = await c.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
      expect(textOf(first)).toBe('#111111')
      writeFileSync(file, ':root { --color-accent: #222222; }')
      const second = await c.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
      expect(textOf(second)).toBe('#222222')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('tells the model when to use it, with examples', async () => {
    const c = await connect(async () => css)
    const { tools } = await c.listTools()
    const description = tools[0].description ?? ''
    expect(description).toContain('before writing any design value')
    expect(description).toContain('tokens.css directly')
    expect(description).toContain('--color-accent')
    expect(description).toContain('--spacing-2')
  })
})

describe('tokens://all', () => {
  it('returns 46 JSON entries with a known category', async () => {
    const c = await connect(async () => css)
    const { contents } = await c.readResource({ uri: 'tokens://all' })
    expect(contents).toHaveLength(1)
    expect(contents[0].mimeType).toBe('application/json')
    const [content] = contents
    if (!('text' in content)) throw new Error('expected a text resource')
    const tokens = JSON.parse(content.text) as { name: string; value: string; category: string }[]
    expect(tokens).toHaveLength(46)
    for (const token of tokens) {
      expect(['color', 'typography', 'rounded', 'spacing']).toContain(token.category)
      expect(Object.keys(token).sort()).toEqual(['category', 'name', 'value'])
    }
  })

  it('fails with a protocol error when the file is missing, and the server keeps answering', async () => {
    const c = await connect(async () => {
      throw new Error('Cannot read tokens file /nope: ENOENT')
    })
    await expect(c.readResource({ uri: 'tokens://all' })).rejects.toThrow('/nope')
    const { resources } = await c.listResources()
    expect(resources.map((resource) => resource.uri)).toEqual(['tokens://all'])
  })
})

describe('style-with-tokens', () => {
  it('returns one user message with the file, the AD-9 instruction and the token list', async () => {
    const c = await connect(async () => css)
    const { messages } = await c.getPrompt({ name: 'style-with-tokens', arguments: { file: 'src/ui/app.css' } })
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    const content = messages[0].content as { type: string; text: string }
    expect(content.type).toBe('text')
    expect(content.text).toContain('src/ui/app.css')
    expect(content.text).toContain('AD-9')
    expect(content.text).toContain('Do not change src/ui/tokens.css itself.')
    expect(content.text).toContain('not by value alone')
    expect(content.text).toContain('--color-accent: #3B6EA8')
    expect(content.text).toContain('--spacing-focus-ring-offset-inset: -2px')
  })

  it('rejects a non-CSS file in the schema with a protocol error', async () => {
    const loadCss = vi.fn(async () => css)
    const c = await connect(loadCss)
    await expect(
      c.getPrompt({ name: 'style-with-tokens', arguments: { file: 'README.md' } }),
    ).rejects.toThrow(/Invalid arguments/)
    expect(loadCss).not.toHaveBeenCalled()
  })
})

describe('stdio entry point', () => {
  it('starts as a real process from another cwd and answers get_token', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--experimental-strip-types', fileURLToPath(new URL('./server.ts', import.meta.url))],
      cwd: '/',
      stderr: 'pipe',
    })
    client = new Client({ name: 'test', version: '0.0.0' })
    await client.connect(transport)
    const result = await client.callTool({ name: 'get_token', arguments: { name: '--color-accent' } })
    expect(result.isError).toBeFalsy()
    expect(textOf(result)).toBe('#3B6EA8')
  })
})

describe('resolveTokensFile', () => {
  it('defaults to src/ui/tokens.css under the project root', () => {
    expect(resolveTokensFile({})).toBe(resolve(projectRoot, 'src/ui/tokens.css'))
  })

  it('resolves a relative path against the project root, not the cwd', () => {
    expect(resolveTokensFile({ TOKENS_FILE: 'a/b.css' })).toBe(resolve(projectRoot, 'a/b.css'))
  })

  it('keeps an absolute path', () => {
    expect(resolveTokensFile({ TOKENS_FILE: '/nope' })).toBe('/nope')
  })
})

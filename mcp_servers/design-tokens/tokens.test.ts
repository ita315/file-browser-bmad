// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CSS_FILE, TOKEN_NAME, findToken, parseTokens } from './tokens.ts'

const css = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8')
// Counted line by line, independently of parseTokens, so a new token doesn't break the test.
const declarationCount = css.split('\n').filter((line) => /^\s*--[a-z0-9-]+\s*:/.test(line)).length

describe('parseTokens', () => {
  it('reads every token declared in the real tokens.css', () => {
    const tokens = parseTokens(css)
    expect(declarationCount).toBeGreaterThan(0)
    expect(tokens).toHaveLength(declarationCount)
    expect(findToken(tokens, '--color-accent')).toEqual({
      name: '--color-accent',
      value: '#3B6EA8',
      category: 'color',
    })
  })

  it('assigns the category from the first name segment', () => {
    for (const token of parseTokens(css)) {
      expect(['color', 'typography', 'rounded', 'spacing']).toContain(token.category)
      expect(token.name.startsWith(`--${token.category}-`)).toBe(true)
    }
  })

  it('keeps values with commas and quotes intact', () => {
    const token = findToken(parseTokens(css), '--typography-body-font-family')
    expect(token?.value).toBe('system-ui, -apple-system, "Segoe UI", sans-serif')
  })

  it('ignores non-custom properties and declarations outside :root', () => {
    const tokens = parseTokens(':root { color-scheme: light; --spacing-1: 4px; }\n.a { --color-x: red; }')
    expect(tokens).toEqual([{ name: '--spacing-1', value: '4px', category: 'spacing' }])
  })

  it('returns the last declaration of a duplicate name, as the cascade does', () => {
    const tokens = parseTokens(':root { --color-accent: #111111; --color-accent: #222222; }')
    expect(findToken(tokens, '--color-accent')?.value).toBe('#222222')
  })

  it('returns undefined for an unknown name', () => {
    expect(findToken(parseTokens(css), '--color-nope')).toBeUndefined()
  })
})

describe('schemas', () => {
  it('TOKEN_NAME requires the leading --', () => {
    expect(TOKEN_NAME.test('--color-accent')).toBe(true)
    expect(TOKEN_NAME.test('color-accent')).toBe(false)
  })

  it('CSS_FILE accepts only .css files under src/', () => {
    expect(CSS_FILE.test('src/ui/app.css')).toBe(true)
    expect(CSS_FILE.test('README.md')).toBe(false)
  })
})

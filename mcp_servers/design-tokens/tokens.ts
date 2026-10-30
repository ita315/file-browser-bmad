// Pure token logic: no protocol, no file system. Tested on its own.

export const CATEGORIES = ['color', 'typography', 'rounded', 'spacing'] as const
export type Category = (typeof CATEGORIES)[number]

export type Token = {
  name: string
  value: string
  category: Category
}

/** A custom-property name, e.g. `--color-accent`. */
export const TOKEN_NAME = /^--[a-z0-9-]+$/

/** A CSS file inside `src/`, e.g. `src/ui/app.css`. */
export const CSS_FILE = /^src\/.+\.css$/

const ROOT_BLOCK = /:root\s*\{([^}]*)\}/g
const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g

function categoryOf(name: string): Category | undefined {
  const first = name.slice(2).split('-')[0]
  return CATEGORIES.find((category) => category === first)
}

/**
 * Reads only `--name: value;` declarations inside `:root` blocks.
 * Not a CSS parser: comments, nesting and other selectors are out of scope.
 */
export function parseTokens(css: string): Token[] {
  const tokens: Token[] = []
  for (const block of css.matchAll(ROOT_BLOCK)) {
    for (const [, name, rawValue] of block[1].matchAll(DECLARATION)) {
      const category = categoryOf(name)
      if (category === undefined) continue
      tokens.push({ name, value: rawValue.trim(), category })
    }
  }
  return tokens
}

/** The last declaration wins, as in the CSS cascade. */
export function findToken(tokens: readonly Token[], name: string): Token | undefined {
  return tokens.findLast((token) => token.name === name)
}

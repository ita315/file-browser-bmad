import type { Register, RenderElement } from 'claude-code'

const PANE = 'file-viewer'
const OPEN = { plugin: 'file-viewer', key: 'open' } as const
const SELECTED = { plugin: 'file-viewer', key: 'selected' } as const
const VIEW = { plugin: 'file-viewer', key: 'view' } as const
const MAX_BYTES = 256 * 1024
const MAX_LINES = 200
const HIDDEN = new Set(['.git', 'node_modules'])
const OUTSIDE = 'Outside the project, not shown'

// Joins `input` to cwd when it is relative, folds "." and "..", and returns the
// normalized path relative to cwd ('' for cwd itself), or null when the result
// is neither cwd nor under cwd + "/". Lexical only: a symlink is not followed.
const insideProject = (cwd: string, input: string): string | null => {
  const fold = (p: string): string => {
    const parts: string[] = []
    for (const seg of p.split('/')) {
      if (seg === '' || seg === '.') continue
      if (seg === '..') parts.pop()
      else parts.push(seg)
    }
    return '/' + parts.join('/')
  }
  const root = fold(cwd)
  const abs = fold(input.startsWith('/') ? input : `${cwd}/${input}`)
  if (abs === root) return ''
  const prefix = root === '/' ? '/' : `${root}/`
  return abs.startsWith(prefix) ? abs.slice(prefix.length) : null
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(1)} ${units[i]}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'file-viewer',
      description: 'Open the file viewer pane beside the chat',
      argumentHint: '[path]',
    })
    return next(e)
  })

  on('command.run', { command: 'file-viewer' }, async ($, e) => {
    const cwd = await $.session.cwd()
    const typed = e.args.trim()
    if (typed) {
      // Inside: store the normalized relative path, so the tree marks it too.
      // Outside: store what was typed; the render rejects it and shows the note.
      const rel = insideProject(cwd, typed)
      if (rel !== '') {
        await $.state.set(SELECTED, rel ?? typed)
        await $.state.set(VIEW, 'preview')
      }
    }
    const folder = cwd.split('/').filter(Boolean).pop() ?? 'project'
    await $.ui.open({ id: PANE, title: folder, focus: true, rows: 24 })
    return { text: 'file-viewer opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Code } = $.ui.resolve(e)
    const { value: opened = [] } = await $.state.get(OPEN)
    const { value: selected } = await $.state.get(SELECTED)
    const { value: view = 'tree' } = await $.state.get(VIEW)

    const toggle = async (path: string) => {
      const { value = [] } = await $.state.get(OPEN)
      await $.state.set(
        OPEN,
        value.includes(path) ? value.filter(p => p !== path) : [...value, path],
      )
    }

    const select = async (path: string) => {
      await $.state.set(SELECTED, path)
      await $.state.set(VIEW, 'preview')
    }

    const walk = async (dir: string, depth: number): Promise<RenderElement[]> => {
      const entries = (await $.fs.list(dir || undefined).catch(() => []))
        .filter(x => !HIDDEN.has(x.name) && (x.kind === 'dir' || x.kind === 'file'))
        .sort((a, b) =>
          a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1,
        )
      const rows: RenderElement[] = []
      for (const x of entries) {
        const path = dir ? `${dir}/${x.name}` : x.name
        if (x.kind === 'file') {
          const isSel = path === selected
          rows.push(
            Box({
              paddingLeft: depth * 2,
              children: Button({
                key: path,
                plain: true,
                onPress: () => void select(path),
                children: Text({
                  children: [
                    Text({
                      color: isSel ? 'claude' : undefined,
                      weight: isSel ? 'bold' : 'regular',
                      children: `${isSel ? '▶' : ' '} ${x.name}  `,
                    }),
                    Text({ dimColor: true, children: formatSize(x.size) }),
                  ],
                }),
              }),
            }),
          )
          continue
        }
        const isOpen = opened.includes(path)
        rows.push(
          Box({
            paddingLeft: depth * 2,
            children: Button({
              key: path,
              plain: true,
              onPress: () => void toggle(path),
              children: Text({
                color: 'suggestion',
                weight: 'bold',
                children: `${isOpen ? '▾' : '▸'} ${x.name}`,
              }),
            }),
          }),
        )
        if (isOpen) rows.push(...(await walk(path, depth + 1)))
      }
      return rows
    }

    const preview = async (typed: string): Promise<RenderElement> => {
      const back = Box({
        marginBottom: 1,
        children: Button({
          key: 'back',
          plain: true,
          onPress: () => void $.state.set(VIEW, 'tree'),
          children: Text({ color: 'permission', weight: 'bold', children: '← Back' }),
        }),
      })
      const cwd = await $.session.cwd()
      const selected = insideProject(cwd, typed)
      if (selected === null) {
        return Box({
          flexDirection: 'column',
          children: [
            back,
            Text({ weight: 'bold', children: typed }),
            Text({ dimColor: true, children: OUTSIDE }),
          ],
        })
      }
      // Follow symlinks before touching the disk any further (list, read): both
      // the file and the project root are resolved, since cwd may itself be
      // reached through a link. A missing file is just unavailable; a missing
      // realPath fails closed.
      const stat = await $.fs.stat(selected, { resolve: true }).catch(() => undefined)
      if (!stat) {
        return Box({
          flexDirection: 'column',
          children: [
            back,
            Text({ weight: 'bold', children: selected }),
            Text({ dimColor: true, children: 'unavailable' }),
          ],
        })
      }
      const real = stat.realPath
      const realRoot = await $.fs.stat(cwd, { resolve: true }).then(s => s.realPath).catch(() => undefined)
      if (real === undefined || realRoot === undefined || insideProject(realRoot, real) === null) {
        return Box({
          flexDirection: 'column',
          children: [
            back,
            Text({ weight: 'bold', children: selected }),
            Text({ dimColor: true, children: OUTSIDE }),
          ],
        })
      }
      const i = selected.lastIndexOf('/')
      const entries = await $.fs.list(i < 0 ? undefined : selected.slice(0, i)).catch(() => [])
      const file = entries.find(x => x.name === selected.slice(i + 1) && x.kind === 'file')
      const head = [
        back,
        Text({ weight: 'bold', children: selected }),
        Text({ dimColor: true, children: file ? formatSize(file.size) : 'unavailable' }),
      ]
      if (!file) return Box({ flexDirection: 'column', children: head })
      const note = (text: string) =>
        Box({ flexDirection: 'column', children: [...head, Text({ dimColor: true, children: text })] })
      if (file.size > MAX_BYTES) return note(`Too large to preview (${formatSize(file.size)})`)
      let raw: string
      try {
        raw = await $.fs.read(real)
      } catch {
        return note("Can't read this file")
      }
      if (raw.slice(0, 8000).includes('\0')) return note('Binary file, no text preview')
      const lines = raw.split('\n')
      if (lines.at(-1) === '') lines.pop()
      const cut = lines.length > MAX_LINES
      return Box({
        flexDirection: 'column',
        children: [
          ...head,
          Code({ source: lines.slice(0, MAX_LINES).join('\n'), path: selected, startLine: 1 }),
          ...(cut ? [Text({ dimColor: true, children: `Showing the first ${MAX_LINES} lines` })] : []),
        ],
      })
    }

    if (view === 'preview' && selected) return preview(selected)
    return Box({ flexDirection: 'column', children: await walk('', 0) })
  })
}

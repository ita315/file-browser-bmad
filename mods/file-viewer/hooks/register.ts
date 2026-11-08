import type { Register, RenderElement } from 'claude-code'

declare module 'claude-code' {
  interface PluginState {
    'file-viewer': { open: string[] }
  }
}

const PANE = 'file-viewer'
const OPEN = { plugin: 'file-viewer', key: 'open' } as const
const HIDDEN = new Set(['.git', 'node_modules'])

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
    })
    return next(e)
  })

  on('command.run', { command: 'file-viewer' }, async $ => {
    const cwd = await $.session.cwd()
    const folder = cwd.split('/').filter(Boolean).pop() ?? 'project'
    await $.ui.open({ id: PANE, title: folder, focus: true, rows: 24 })
    return { text: 'file-viewer opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { value: opened = [] } = await $.state.get(OPEN)

    const toggle = async (path: string) => {
      const { value = [] } = await $.state.get(OPEN)
      await $.state.set(
        OPEN,
        value.includes(path) ? value.filter(p => p !== path) : [...value, path],
      )
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
          rows.push(
            Box({
              paddingLeft: depth * 2,
              children: Text({
                children: [`  ${x.name}  `, Text({ dimColor: true, children: formatSize(x.size) })],
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

    return Box({ flexDirection: 'column', children: await walk('', 0) })
  })
}

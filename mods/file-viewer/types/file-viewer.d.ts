declare module 'claude-code' {
  interface PluginState {
    'file-viewer': { open: string[]; selected: string; view: 'tree' | 'preview' }
  }
}

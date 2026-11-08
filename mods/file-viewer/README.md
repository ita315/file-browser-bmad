# file-viewer

A Claude Code mod that opens a pane beside the chat with the project tree.

- Folders first, then files, each group sorted by name
- Click a folder to open or close it (▸ closed, ▾ open)
- File sizes shown next to each file
- `.git` and `node_modules` are hidden
- Click a file to open a preview: path, size, and the content with syntax
  colors and line numbers (up to 256 KB and the first 200 lines)
- `← Back` returns to the tree, and the file stays marked with ▶
- A file that is too large, binary or unreadable shows one calm line instead
- A path outside the project is rejected, also with `..` or through a symlink
  (checked on its `realPath`)

## Run

From the project root:

    CLAUDE_CODE_NO_FLICKER=1 claude --plugin-dir mods/file-viewer

Then type `/file-viewer`, or `/file-viewer <path>` to open a file directly.

The pane sits beside the chat only in fullscreen mode with at least 110 columns.
Otherwise it appears above the prompt.

## After a fresh clone

Run once:

    claude plugin validate mods/file-viewer

This generates the types in `.claude-plugin/types` that `tsconfig.json` extends.
Then `npx tsc --noEmit -p mods/file-viewer` works.

## What it calls

`$.fs.list`, `$.fs.stat` and `$.fs.read`, all read-only. The mod never writes.
The open folders, the selected file and the current view are kept in `$.state`.

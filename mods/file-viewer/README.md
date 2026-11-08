# file-viewer

A Claude Code mod that opens a pane beside the chat with the project tree.

- Folders first, then files, each group sorted by name
- Click a folder to open or close it (▸ closed, ▾ open)
- File sizes shown next to each file
- `.git` and `node_modules` are hidden

## Run

From the project root:

    CLAUDE_CODE_NO_FLICKER=1 claude --plugin-dir mods/file-viewer

Then type `/file-viewer`.

The pane sits beside the chat only in fullscreen mode with at least 110 columns.
Otherwise it appears above the prompt.

## After a fresh clone

Run once:

    claude plugin validate mods/file-viewer

This generates the types in `.claude-plugin/types` that `tsconfig.json` extends.
Then `npx tsc --noEmit -p mods/file-viewer` works.

## What it calls

The only filesystem call is `$.fs.list`, so the mod is read-only. It never reads
file contents and never writes. The set of open folders is kept in `$.state`.

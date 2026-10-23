import { describe, expect, it } from 'vitest';
import { reduce } from './reducer.ts';
import { selectDetails, selectTopBar, selectVisibleRows } from './selectors.ts';
import type { Entry, SourceRef } from './source.ts';
import { createInitialState, statusKey } from './state.ts';
import { TEXT } from './text.ts';

const ref = {} as SourceRef;
const entry = (name: string, kind: Entry['kind'] = 'file'): Entry => ({ name, kind, ref });

describe('FR-6 before a root is picked', () => {
  const state = createInitialState(true);

  it('shows only the picker in the top bar', () => {
    expect(selectTopBar(state)).toEqual({ mode: 'picker', rootName: null });
  });

  it('shows an empty tree with no text', () => {
    expect(selectVisibleRows(state)).toEqual([]);
  });

  it('shows the empty details prompt', () => {
    expect(selectDetails(state)).toEqual({ type: 'empty' });
  });
});

describe('FR-2 selectTopBar', () => {
  it('shows only the unsupported message', () => {
    expect(selectTopBar(createInitialState(false))).toEqual({
      mode: 'unsupported',
      text: TEXT.unsupportedBrowser,
    });
  });
});

describe('FR-1 FR-3 selectVisibleRows at the root', () => {
  const picked = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });

  it('shows the root name in the top bar', () => {
    expect(selectTopBar(picked)).toEqual({ mode: 'picker', rootName: 'root' });
  });

  it('shows Loading… under the root while it loads', () => {
    expect(selectVisibleRows(picked)).toEqual([
      { type: 'item', id: '', name: 'root', icon: 'folder', chevron: 'expanded', depth: 0, selected: false, unreadable: false },
      { type: 'status', key: statusKey(''), depth: 1, text: TEXT.loading },
    ]);
  });

  it('shows the direct children, folders with a collapsed chevron and files with none', () => {
    const loaded = reduce(picked, {
      type: 'loadSucceeded',
      gen: 1,
      id: '',
      entries: [entry('notes.txt'), entry('src', 'directory')],
    });
    expect(selectVisibleRows(loaded).slice(1)).toEqual([
      { type: 'item', id: 'src', name: 'src', icon: 'folder', chevron: 'collapsed', depth: 1, selected: false, unreadable: false },
      { type: 'item', id: 'notes.txt', name: 'notes.txt', icon: 'file', chevron: 'none', depth: 1, selected: false, unreadable: false },
    ]);
  });

  it('drops a load result from an old generation and returns the same state', () => {
    const stale = reduce(picked, { type: 'loadSucceeded', gen: 0, id: '', entries: [entry('x')] });
    expect(stale).toBe(picked);
  });

  it('drops loadFailed and loadTruncated from an old generation and returns the same state', () => {
    expect(reduce(picked, { type: 'loadFailed', gen: 0, id: '' })).toBe(picked);
    expect(reduce(picked, { type: 'loadTruncated', gen: 0, id: '', entries: [entry('x')] })).toBe(picked);
  });

  it('drops a second result for a folder that already loaded', () => {
    const loaded = reduce(picked, { type: 'loadSucceeded', gen: 1, id: '', entries: [] });
    expect(reduce(loaded, { type: 'loadFailed', gen: 1, id: '' })).toBe(loaded);
  });
});

describe('FR-3 reducer: toggled and loadStarted', () => {
  const picked = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });
  const loaded = reduce(picked, {
    type: 'loadSucceeded',
    gen: 1,
    id: '',
    entries: [entry('src', 'directory'), entry('a.txt'), entry('secret', 'directory')],
  });
  const started = reduce(loaded, { type: 'loadStarted', gen: 1, id: 'secret' });
  const withFailed = reduce(started, { type: 'loadFailed', gen: 1, id: 'secret' });

  it('toggled only flips expanded and leaves load and selectedId alone', () => {
    const selected = { ...loaded, selectedId: 'a.txt' };
    const opened = reduce(selected, { type: 'toggled', id: 'src' });
    expect(opened).not.toBe(selected);
    expect(opened.expanded.has('src')).toBe(true);
    expect(opened.nodes).toBe(loaded.nodes);
    expect(opened.selectedId).toBe('a.txt');
    expect(opened.nodes.get('src')?.load).toBe('unloaded');
    const closed = reduce(opened, { type: 'toggled', id: 'src' });
    expect(closed.expanded.has('src')).toBe(false);
    expect(closed.nodes).toBe(loaded.nodes);
    expect(closed.selectedId).toBe('a.txt');
  });

  it('loadStarted leaves selectedId alone', () => {
    const selected = { ...loaded, selectedId: 'src' };
    const next = reduce(selected, { type: 'loadStarted', gen: 1, id: 'src' });
    expect(next.nodes.get('src')?.load).toBe('loading');
    expect(next.selectedId).toBe('src');
  });

  it('toggled also closes and opens the root', () => {
    const closed = reduce(loaded, { type: 'toggled', id: '' });
    expect(closed.expanded.has('')).toBe(false);
    expect(selectVisibleRows(closed)).toHaveLength(1);
  });

  it('drops toggled on a file, a failed folder or an unknown id (same reference)', () => {
    expect(reduce(loaded, { type: 'toggled', id: 'a.txt' })).toBe(loaded);
    expect(withFailed.nodes.get('secret')?.load).toBe('failed');
    expect(reduce(withFailed, { type: 'toggled', id: 'secret' })).toBe(withFailed);
    expect(reduce(loaded, { type: 'toggled', id: 'missing' })).toBe(loaded);
  });

  it('loadStarted marks an unloaded folder loading', () => {
    expect(started.nodes.get('secret')?.load).toBe('loading');
  });

  it('drops loadStarted from an old generation or for a folder that is not unloaded (same reference)', () => {
    expect(reduce(loaded, { type: 'loadStarted', gen: 0, id: 'src' })).toBe(loaded);
    expect(reduce(loaded, { type: 'loadStarted', gen: 2, id: 'src' })).toBe(loaded);
    expect(reduce(started, { type: 'loadStarted', gen: 1, id: 'secret' })).toBe(started);
    expect(reduce(loaded, { type: 'loadStarted', gen: 1, id: '' })).toBe(loaded);
    expect(reduce(withFailed, { type: 'loadStarted', gen: 1, id: 'secret' })).toBe(withFailed);
    expect(reduce(loaded, { type: 'loadStarted', gen: 1, id: 'a.txt' })).toBe(loaded);
    expect(reduce(loaded, { type: 'loadStarted', gen: 1, id: 'missing' })).toBe(loaded);
  });
});

describe('FR-3 FR-5 selectVisibleRows in depth', () => {
  let state = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });
  state = reduce(state, {
    type: 'loadSucceeded',
    gen: 1,
    id: '',
    entries: [entry('logs', 'directory'), entry('secret', 'directory'), entry('empty', 'directory'), entry('z.txt')],
  });
  for (const id of ['logs', 'secret', 'empty']) {
    state = reduce(state, { type: 'toggled', id });
    state = reduce(state, { type: 'loadStarted', gen: 1, id });
  }
  state = reduce(state, { type: 'loadFailed', gen: 1, id: 'secret' });
  state = reduce(state, { type: 'loadSucceeded', gen: 1, id: 'empty', entries: [] });
  state = reduce(state, {
    type: 'loadTruncated',
    gen: 1,
    id: 'logs',
    entries: [entry('b.log'), entry('archive', 'directory')],
  });
  state = reduce(state, { type: 'toggled', id: 'logs/archive' });
  state = reduce(state, { type: 'loadStarted', gen: 1, id: 'logs/archive' });

  it('lists a flat DFS with one status row per open folder at depth + 1, after the whole subtree', () => {
    expect(selectVisibleRows(state)).toEqual([
      { type: 'item', id: '', name: 'root', icon: 'folder', chevron: 'expanded', depth: 0, selected: false, unreadable: false },
      { type: 'item', id: 'empty', name: 'empty', icon: 'folder', chevron: 'expanded', depth: 1, selected: false, unreadable: false },
      { type: 'status', key: statusKey('empty'), depth: 2, text: TEXT.emptyFolder },
      { type: 'item', id: 'logs', name: 'logs', icon: 'folder', chevron: 'expanded', depth: 1, selected: false, unreadable: false },
      { type: 'item', id: 'logs/archive', name: 'archive', icon: 'folder', chevron: 'expanded', depth: 2, selected: false, unreadable: false },
      { type: 'status', key: statusKey('logs/archive'), depth: 3, text: TEXT.loading },
      { type: 'item', id: 'logs/b.log', name: 'b.log', icon: 'file', chevron: 'none', depth: 2, selected: false, unreadable: false },
      { type: 'status', key: statusKey('logs'), depth: 2, text: TEXT.unableToRead },
      { type: 'item', id: 'secret', name: 'secret', icon: 'folder', chevron: 'none', depth: 1, selected: false, unreadable: true },
      { type: 'item', id: 'z.txt', name: 'z.txt', icon: 'file', chevron: 'none', depth: 1, selected: false, unreadable: false },
    ]);
  });

  it('hides the whole subtree, status rows included, when a folder is collapsed', () => {
    const collapsed = reduce(state, { type: 'toggled', id: 'logs' });
    expect(selectVisibleRows(collapsed).map((r) => (r.type === 'item' ? r.id : r.key))).toEqual([
      '',
      'empty',
      statusKey('empty'),
      'logs',
      'secret',
      'z.txt',
    ]);
  });
});

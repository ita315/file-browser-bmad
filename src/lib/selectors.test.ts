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

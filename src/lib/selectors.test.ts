import { describe, expect, it } from 'vitest';
import { reduce } from './reducer.ts';
import { selectDetails, selectPreview, selectTopBar, selectVisibleRows } from './selectors.ts';
import type { Entry, SourceRef } from './source.ts';
import { formatDate } from './format.ts';
import { createInitialState, statusKey } from './state.ts';
import type { AppState } from './state.ts';
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

describe('FR-3 FR-5 FR-7 reducer: selection and meta actions', () => {
  const picked = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });
  const loaded = reduce(picked, {
    type: 'loadSucceeded',
    gen: 1,
    id: '',
    entries: [entry('src', 'directory'), entry('a.txt'), entry('b.txt')],
  });
  const loadingA = reduce(loaded, { type: 'fileSelected', gen: 1, id: 'a.txt', requestId: 1 });
  const readyA = reduce(loadingA, {
    type: 'metaLoaded',
    gen: 1,
    requestId: 1,
    meta: { size: 1500, lastModified: 0 },
  });

  it('fileSelected selects a file and starts loading its details', () => {
    expect(loadingA.selectedId).toBe('a.txt');
    expect(loadingA.details).toEqual({ kind: 'loading', id: 'a.txt', requestId: 1 });
    expect(readyA.details).toEqual({ kind: 'ready', id: 'a.txt', requestId: 1, size: 1500, lastModified: 0 });
  });

  it('drops fileSelected from an old generation, for the selected file, a folder or an unknown id (same reference)', () => {
    expect(reduce(loaded, { type: 'fileSelected', gen: 0, id: 'a.txt', requestId: 1 })).toBe(loaded);
    expect(reduce(loadingA, { type: 'fileSelected', gen: 1, id: 'a.txt', requestId: 2 })).toBe(loadingA);
    expect(reduce(readyA, { type: 'fileSelected', gen: 1, id: 'a.txt', requestId: 2 })).toBe(readyA);
    expect(reduce(loaded, { type: 'fileSelected', gen: 1, id: 'src', requestId: 1 })).toBe(loaded);
    expect(reduce(loaded, { type: 'fileSelected', gen: 1, id: 'missing', requestId: 1 })).toBe(loaded);
  });

  it('drops metaLoaded from an old generation or an old request (same reference)', () => {
    expect(reduce(loadingA, { type: 'metaLoaded', gen: 2, requestId: 1, meta: { size: 1, lastModified: 0 } })).toBe(loadingA);
    expect(reduce(loadingA, { type: 'metaLoaded', gen: 1, requestId: 7, meta: { size: 1, lastModified: 0 } })).toBe(loadingA);
    expect(reduce(readyA, { type: 'metaLoaded', gen: 1, requestId: 1, meta: { size: 1, lastModified: 0 } })).toBe(readyA);
    expect(reduce(loaded, { type: 'metaLoaded', gen: 1, requestId: 1, meta: { size: 1, lastModified: 0 } })).toBe(loaded);
  });

  it('metaFailed marks the file; it clears the selection only for the current request', () => {
    const failed = reduce(loadingA, { type: 'metaFailed', gen: 1, id: 'a.txt', requestId: 1 });
    expect(failed.nodes.get('a.txt')?.unreadable).toBe(true);
    expect(failed.selectedId).toBeNull();
    expect(failed.details).toEqual({ kind: 'none' });

    const loadingB = reduce(loadingA, { type: 'fileSelected', gen: 1, id: 'b.txt', requestId: 2 });
    const oldFailed = reduce(loadingB, { type: 'metaFailed', gen: 1, id: 'a.txt', requestId: 1 });
    expect(oldFailed.nodes.get('a.txt')?.unreadable).toBe(true);
    expect(oldFailed.selectedId).toBe('b.txt');
    expect(oldFailed.details).toBe(loadingB.details);
  });

  it('drops metaFailed from an old generation, for a folder or an unknown id, or when already marked (same reference)', () => {
    expect(reduce(loadingA, { type: 'metaFailed', gen: 2, id: 'a.txt', requestId: 1 })).toBe(loadingA);
    expect(reduce(loadingA, { type: 'metaFailed', gen: 1, id: 'src', requestId: 1 })).toBe(loadingA);
    expect(reduce(loadingA, { type: 'metaFailed', gen: 1, id: 'missing', requestId: 1 })).toBe(loadingA);
    const marked = reduce(loadingA, { type: 'metaFailed', gen: 1, id: 'a.txt', requestId: 1 });
    expect(reduce(marked, { type: 'metaFailed', gen: 1, id: 'a.txt', requestId: 1 })).toBe(marked);
  });

  it('drops folderSelected for an unknown id (same reference)', () => {
    expect(reduce(loaded, { type: 'folderSelected', id: 'missing' })).toBe(loaded);
  });

  it('fileSelected on an unreadable file clears the selection; same reference when nothing is selected', () => {
    const marked = reduce(loadingA, { type: 'metaFailed', gen: 1, id: 'a.txt', requestId: 1 });
    expect(reduce(marked, { type: 'fileSelected', gen: 1, id: 'a.txt', requestId: 2 })).toBe(marked);
    const withB = reduce(marked, { type: 'fileSelected', gen: 1, id: 'b.txt', requestId: 2 });
    const cleared = reduce(withB, { type: 'fileSelected', gen: 1, id: 'a.txt', requestId: 3 });
    expect(cleared.selectedId).toBeNull();
    expect(cleared.details).toEqual({ kind: 'none' });
  });

  it('folderSelected selects a folder with no details, and clears the selection on a failed folder', () => {
    const folder = reduce(readyA, { type: 'folderSelected', id: 'src' });
    expect(folder.selectedId).toBe('src');
    expect(folder.details).toEqual({ kind: 'none' });
    expect(reduce(folder, { type: 'folderSelected', id: 'src' })).toBe(folder);
    expect(reduce(loaded, { type: 'folderSelected', id: 'a.txt' })).toBe(loaded);

    const started = reduce(folder, { type: 'loadStarted', gen: 1, id: 'src' });
    const failed = reduce(started, { type: 'loadFailed', gen: 1, id: 'src' });
    expect(failed.selectedId).toBe('src');
    const cleared = reduce(failed, { type: 'folderSelected', id: 'src' });
    expect(cleared.selectedId).toBeNull();
    expect(reduce(cleared, { type: 'folderSelected', id: 'src' })).toBe(cleared);
  });
});

describe('FR-6 FR-7 FR-8 selectDetails', () => {
  const picked = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });
  const loaded = reduce(picked, {
    type: 'loadSucceeded',
    gen: 1,
    id: '',
    entries: [entry('src', 'directory'), entry('report.pdf')],
  });
  const loading = reduce(loaded, { type: 'fileSelected', gen: 1, id: 'report.pdf', requestId: 1 });
  const ms = Date.UTC(2026, 9, 22, 15, 20);
  const ready = (lastModified: number | null): AppState =>
    reduce(loading, { type: 'metaLoaded', gen: 1, requestId: 1, meta: { size: 1500, lastModified } });

  it('shows the empty prompt with nothing selected', () => {
    expect(selectDetails(loaded)).toEqual({ type: 'empty' });
  });

  it('shows the name while a file is loading', () => {
    expect(selectDetails(loading)).toEqual({ type: 'loading', name: 'report.pdf' });
  });

  it('shows ready strings for a file', () => {
    expect(selectDetails(ready(ms))).toEqual({
      type: 'file',
      name: 'report.pdf',
      typeLabel: 'PDF',
      size: '1.5 KB',
      modified: formatDate(ms),
    });
    expect(selectDetails(ready(null))).toMatchObject({ modified: TEXT.unknownValue });
  });

  it('shows only the name for a folder', () => {
    expect(selectDetails(reduce(ready(ms), { type: 'folderSelected', id: 'src' }))).toEqual({ type: 'folder', name: 'src' });
    expect(selectDetails(reduce(loaded, { type: 'folderSelected', id: '' }))).toEqual({ type: 'folder', name: 'root' });
  });

  it('marks only the selected row', () => {
    const rows = selectVisibleRows(loading).filter((r) => r.type === 'item');
    expect(rows.filter((r) => r.selected).map((r) => r.id)).toEqual(['report.pdf']);
  });
});

describe('image preview: reducer and selectPreview', () => {
  const picked = reduce(createInitialState(true), { type: 'rootPicked', gen: 1, entry: entry('root', 'directory') });
  const loaded = reduce(picked, {
    type: 'loadSucceeded',
    gen: 1,
    id: '',
    entries: [entry('src', 'directory'), entry('photo.JPG'), entry('b.png'), entry('notes.txt'), entry('.png')],
  });
  const loadingPhoto = reduce(loaded, { type: 'fileSelected', gen: 1, id: 'photo.JPG', requestId: 1 });
  const blob = new Blob(['x']);
  const readyPhoto = reduce(loadingPhoto, { type: 'previewLoaded', gen: 1, requestId: 1, blob });

  it('starts with no preview', () => {
    expect(createInitialState(true).preview).toEqual({ kind: 'none' });
    expect(selectPreview(loaded)).toEqual({ type: 'none' });
  });

  it('fileSelected on an image starts loading the preview with the same id and requestId', () => {
    expect(loadingPhoto.preview).toEqual({ kind: 'loading', id: 'photo.JPG', requestId: 1, shown: null });
    expect(selectPreview(loadingPhoto)).toEqual({ type: 'loading' });
  });

  it.each(['notes.txt', '.png'])('fileSelected on %s has no preview', (id) => {
    const state = reduce(loaded, { type: 'fileSelected', gen: 1, id, requestId: 1 });
    expect(state.preview).toEqual({ kind: 'none' });
    expect(selectPreview(state)).toEqual({ type: 'none' });
  });

  it('previewLoaded shows the image with the MIME from its extension', () => {
    expect(readyPhoto.preview).toEqual({ kind: 'ready', id: 'photo.JPG', requestId: 1, blob });
    expect(selectPreview(readyPhoto)).toEqual({ type: 'image', blob, mime: 'image/jpeg', held: false });
    expect(readyPhoto.details).toBe(loadingPhoto.details);
  });

  it('previewFailed shows unavailable without touching the details', () => {
    const failed = reduce(loadingPhoto, { type: 'previewFailed', gen: 1, requestId: 1 });
    expect(failed.preview).toEqual({ kind: 'failed', id: 'photo.JPG', requestId: 1 });
    expect(selectPreview(failed)).toEqual({ type: 'unavailable' });
    expect(failed.details).toBe(loadingPhoto.details);
  });

  it('drops previewLoaded / previewFailed from an old generation, an old request or a settled preview (same reference)', () => {
    for (const type of ['previewLoaded', 'previewFailed'] as const) {
      const act = (gen: number, requestId: number) =>
        type === 'previewLoaded' ? { type, gen, requestId, blob } : { type, gen, requestId };
      expect(reduce(loadingPhoto, act(2, 1))).toBe(loadingPhoto);
      expect(reduce(loadingPhoto, act(1, 7))).toBe(loadingPhoto);
      expect(reduce(readyPhoto, act(1, 1))).toBe(readyPhoto);
      expect(reduce(loaded, act(1, 1))).toBe(loaded);
    }
  });

  it('a new image selection replaces the preview; the old content is dropped', () => {
    const loadingB = reduce(readyPhoto, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 });
    expect(loadingB.preview).toEqual({ kind: 'loading', id: 'b.png', requestId: 2, shown: readyPhoto.preview });
    expect(reduce(loadingB, { type: 'previewLoaded', gen: 1, requestId: 1, blob })).toBe(loadingB);
  });

  it('folderSelected, rootPicked and a current metaFailed clear the preview', () => {
    expect(reduce(readyPhoto, { type: 'folderSelected', id: 'src' }).preview).toEqual({ kind: 'none' });
    expect(reduce(readyPhoto, { type: 'rootPicked', gen: 2, entry: entry('other', 'directory') }).preview).toEqual({
      kind: 'none',
    });
    const failed = reduce(readyPhoto, { type: 'metaFailed', gen: 1, id: 'photo.JPG', requestId: 1 });
    expect(failed.selectedId).toBeNull();
    expect(failed.preview).toEqual({ kind: 'none' });
  });

  it('an old metaFailed keeps the current preview', () => {
    const loadingB = reduce(readyPhoto, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 });
    const oldFailed = reduce(loadingB, { type: 'metaFailed', gen: 1, id: 'photo.JPG', requestId: 1 });
    expect(oldFailed.preview).toBe(loadingB.preview);
  });

  it('selecting a known unreadable image clears the preview', () => {
    const failed = reduce(readyPhoto, { type: 'metaFailed', gen: 1, id: 'photo.JPG', requestId: 1 });
    const loadingB = reduce(failed, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 });
    const again = reduce(loadingB, { type: 'fileSelected', gen: 1, id: 'photo.JPG', requestId: 3 });
    expect(again.selectedId).toBeNull();
    expect(again.preview).toEqual({ kind: 'none' });
  });

  describe('shown: what stays on screen while the next image loads', () => {
    const blobB = new Blob(['B']);
    const loadingB = reduce(readyPhoto, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 });
    const readyB = reduce(loadingB, { type: 'previewLoaded', gen: 1, requestId: 2, blob: blobB });

    it('image → image keeps the ready image and shows it, held, with its own MIME', () => {
      expect(loadingB.preview).toMatchObject({ kind: 'loading', shown: readyPhoto.preview });
      expect(selectPreview(loadingB)).toEqual({ type: 'image', blob, mime: 'image/jpeg', held: true });
      expect(selectPreview(readyB)).toEqual({ type: 'image', blob: blobB, mime: 'image/png', held: false });
    });

    it('A → B → C while B still loads keeps A', () => {
      const loadingPhotoAgain = reduce(loadingB, { type: 'fileSelected', gen: 1, id: 'photo.JPG', requestId: 3 });
      expect(loadingPhotoAgain.preview).toMatchObject({ kind: 'loading', requestId: 3, shown: readyPhoto.preview });
      expect(selectPreview(loadingPhotoAgain)).toEqual({ type: 'image', blob, mime: 'image/jpeg', held: true });
    });

    it('A → B → C after B is ready keeps B (held, so the UI starts nothing new for it)', () => {
      const loadingC = reduce(readyB, { type: 'fileSelected', gen: 1, id: 'photo.JPG', requestId: 3 });
      expect(loadingC.preview).toMatchObject({ kind: 'loading', shown: readyB.preview });
      expect(selectPreview(loadingC)).toEqual({ type: 'image', blob: blobB, mime: 'image/png', held: true });
    });

    it('failed → image keeps the message', () => {
      const failed = reduce(loadingPhoto, { type: 'previewFailed', gen: 1, requestId: 1 });
      const next = reduce(failed, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 });
      expect(next.preview).toMatchObject({ kind: 'loading', shown: failed.preview });
      expect(selectPreview(next)).toEqual({ type: 'unavailable' });
    });

    it('non-image → image has nothing to keep and shows Loading…', () => {
      const notes = reduce(readyPhoto, { type: 'fileSelected', gen: 1, id: 'notes.txt', requestId: 2 });
      const next = reduce(notes, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 3 });
      expect(next.preview).toMatchObject({ kind: 'loading', shown: null });
      expect(selectPreview(next)).toEqual({ type: 'loading' });
    });

    it('a folder or a new root in between leaves nothing to keep', () => {
      const folder = reduce(readyPhoto, { type: 'folderSelected', id: 'src' });
      expect(reduce(folder, { type: 'fileSelected', gen: 1, id: 'b.png', requestId: 2 }).preview).toMatchObject({
        shown: null,
      });
      expect(reduce(loadingB, { type: 'folderSelected', id: 'src' }).preview).toEqual({ kind: 'none' });
      const repicked = reduce(loadingB, { type: 'rootPicked', gen: 2, entry: entry('root', 'directory') });
      expect(repicked.preview).toEqual({ kind: 'none' });
    });

    it('the new content replaces shown, and a late result for the old request is dropped', () => {
      expect(readyB.preview).toEqual({ kind: 'ready', id: 'b.png', requestId: 2, blob: blobB });
      expect(reduce(loadingB, { type: 'previewLoaded', gen: 1, requestId: 1, blob })).toBe(loadingB);
      const failedB = reduce(loadingB, { type: 'previewFailed', gen: 1, requestId: 2 });
      expect(failedB.preview).toEqual({ kind: 'failed', id: 'b.png', requestId: 2 });
    });
  });
});

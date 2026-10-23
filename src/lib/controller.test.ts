import { describe, expect, it, vi } from 'vitest';
import { createController } from './controller.ts';
import { formatDate } from './format.ts';
import { selectDetails, selectVisibleRows } from './selectors.ts';
import type { ItemRow } from './selectors.ts';
import type { Entry, SourceRef } from './source.ts';
import { ROOT_ID } from './state.ts';
import { TEXT } from './text.ts';
import { createFakeSource, deferred, dir, file, flush } from '../test/fakeSource.ts';
import type { FakeDir, FakeSource } from '../test/fakeSource.ts';

function rowLabels(state: Parameters<typeof selectVisibleRows>[0]): string[] {
  return selectVisibleRows(state).map((r) => (r.type === 'item' ? r.name : `[${r.text}]`));
}

describe('FR-2 unsupported browser', () => {
  it('openFolder does not call pickRoot and leaves state unchanged', async () => {
    const source = createFakeSource({ supported: false });
    const controller = createController(source);
    const before = controller.getState();
    expect(before.supported).toBe(false);
    await controller.openFolder();
    expect(source.calls.pickRoot).toBe(0);
    expect(controller.getState()).toBe(before);
  });
});

describe('FR-1 cancel', () => {
  it('keeps the same state reference when there is no root', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    const listener = vi.fn();
    controller.subscribe(listener);
    const before = controller.getState();
    source.queueCancel();
    await controller.openFolder();
    expect(source.calls.pickRoot).toBe(1);
    expect(controller.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps the same state reference when a root is already shown', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('project', dir({ a: file() }));
    await controller.openFolder();
    const before = controller.getState();
    const listener = vi.fn();
    controller.subscribe(listener);
    source.queueCancel();
    await controller.openFolder();
    expect(controller.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('FR-1 FR-3 FR-4 picking a root', () => {
  it('shows the root expanded with Loading… and then its sorted contents', async () => {
    const gate = deferred();
    const root = dir(
      {
        b: file(),
        A: file(),
        c: file(),
        file10: file(),
        file2: file(),
        '.git': dir(),
        readme: file(),
        README: file(),
      },
      { gate: gate.promise },
    );
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('project', root);

    const done = controller.openFolder();
    await flush();
    const loading = controller.getState();
    expect(loading.generation).toBe(1);
    expect(loading.nodes.get(ROOT_ID)?.load).toBe('loading');
    const loadingRows = selectVisibleRows(loading);
    expect(loadingRows[0]).toMatchObject({ type: 'item', id: ROOT_ID, name: 'project', depth: 0, chevron: 'expanded' });
    expect(loadingRows[1]).toMatchObject({ type: 'status', depth: 1, text: TEXT.loading });
    expect(loadingRows).toHaveLength(2);

    gate.resolve();
    await done;
    expect(rowLabels(controller.getState())).toEqual([
      'project',
      '.git',
      'A',
      'b',
      'c',
      'file2',
      'file10',
      'README',
      'readme',
    ]);
    const git = selectVisibleRows(controller.getState())[1] as ItemRow;
    expect(git).toMatchObject({ id: '.git', icon: 'folder', chevron: 'collapsed', depth: 1 });
  });

  it('shows Empty folder for an empty root', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('empty', dir());
    await controller.openFolder();
    expect(rowLabels(controller.getState())).toEqual(['empty', `[${TEXT.emptyFolder}]`]);
  });

  it('marks the root failed, with no chevron and no status rows, when the read fails before the first entry', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('locked', dir({ a: file() }, { failAfter: 0 }));
    await expect(controller.openFolder()).resolves.toBeUndefined();
    const state = controller.getState();
    expect(state.nodes.get(ROOT_ID)?.load).toBe('failed');
    const rows = selectVisibleRows(state);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: 'item', chevron: 'none', unreadable: true });
  });

  it('marks the root failed when the gate rejects', async () => {
    const gate = deferred();
    gate.reject(new Error('denied'));
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('locked', dir({ a: file() }, { gate: gate.promise }));
    await controller.openFolder();
    expect(controller.getState().nodes.get(ROOT_ID)?.load).toBe('failed');
  });

  it('keeps the entries it got, sorted, when the read fails mid-way', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('partial', dir({ z: file(), y: file(), x: file() }, { failAfter: 2 }));
    await controller.openFolder();
    const state = controller.getState();
    expect(state.nodes.get(ROOT_ID)).toMatchObject({ load: 'loaded', truncated: true });
    expect(rowLabels(state)).toEqual(['partial', 'y', 'z', `[${TEXT.unableToRead}]`]);
  });
});

describe('FR-1 replacing the root', () => {
  it('drops the contents of the old root when they arrive after the new one', async () => {
    const gateA = deferred();
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('A', dir({ fromA: file() }, { gate: gateA.promise }));
    source.queuePick('B', dir({ fromB: file() }));

    const doneA = controller.openFolder();
    await flush();
    await controller.openFolder();
    const afterB = controller.getState();
    expect(afterB.generation).toBe(2);
    expect(rowLabels(afterB)).toEqual(['B', 'fromB']);

    gateA.resolve();
    await doneA;
    expect(controller.getState()).toBe(afterB);
  });

  it('re-reads and replaces the tree when the same folder is picked again', async () => {
    const root = dir({ a: file() });
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('project', root);
    await controller.openFolder();
    const first = controller.getState();

    source.queuePick('project', root);
    await controller.openFolder();
    const second = controller.getState();
    expect(second).not.toBe(first);
    expect(second.nodes).not.toBe(first.nodes);
    expect(second.generation).toBe(2);
    expect(source.calls.listChildren).toEqual([root, root]);
    expect(rowLabels(second)).toEqual(['project', 'a']);
  });
});

async function pickRoot(root: FakeDir, source: FakeSource = createFakeSource()) {
  const controller = createController(source);
  source.queuePick('project', root);
  await controller.openFolder();
  return { source, controller };
}

function rowsWithDepth(state: Parameters<typeof selectVisibleRows>[0]): string[] {
  return selectVisibleRows(state).map((r) => `${r.depth}:${r.type === 'item' ? r.name : `[${r.text}]`}`);
}

function readsOf(source: FakeSource, node: FakeDir): number {
  return source.calls.listChildren.filter((d) => d === node).length;
}

describe('FR-3 toggling a folder', () => {
  it('opens a closed folder: chevron expanded, Loading… at depth 2, then the sorted children (AC-1)', async () => {
    const gate = deferred();
    const src = dir({ 'b.ts': file(), lib: dir(), 'A.ts': file() }, { gate: gate.promise });
    const { controller } = await pickRoot(dir({ src, 'z.txt': file() }));
    const selectedBefore = controller.getState().selectedId;

    const done = controller.toggle('src');
    await flush();
    const loading = controller.getState();
    expect(loading.nodes.get('src')?.load).toBe('loading');
    expect(selectVisibleRows(loading).find((r) => r.type === 'item' && r.id === 'src')).toMatchObject({
      chevron: 'expanded',
    });
    expect(rowsWithDepth(loading)).toEqual(['0:project', '1:src', `2:[${TEXT.loading}]`, '1:z.txt']);

    gate.resolve();
    await expect(done).resolves.toBeUndefined();
    const loaded = controller.getState();
    expect(rowsWithDepth(loaded)).toEqual(['0:project', '1:src', '2:lib', '2:A.ts', '2:b.ts', '1:z.txt']);
    expect(loaded.selectedId).toBe(selectedBefore);
  });

  it('collapses and re-expands without reading again, including the root (AC-2)', async () => {
    const src = dir({ 'a.ts': file() });
    const { source, controller } = await pickRoot(dir({ src }));
    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', '2:a.ts']);

    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src']);
    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', '2:a.ts']);
    expect(readsOf(source, src)).toBe(1);

    await controller.toggle(ROOT_ID);
    expect(selectVisibleRows(controller.getState())).toEqual([
      expect.objectContaining({ id: ROOT_ID, chevron: 'collapsed' }),
    ]);
    await controller.toggle(ROOT_ID);
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', '2:a.ts']);
    expect(source.calls.listChildren).toHaveLength(2);
  });

  it('does not cancel a load when collapsed; reopening before it ends shows Loading… (AC-3)', async () => {
    const gate = deferred();
    const src = dir({ 'a.ts': file() }, { gate: gate.promise });
    const { source, controller } = await pickRoot(dir({ src }));

    const first = controller.toggle('src');
    await flush();
    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src']);
    expect(controller.getState().nodes.get('src')?.load).toBe('loading');
    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', `2:[${TEXT.loading}]`]);

    gate.resolve();
    await first;
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', '2:a.ts']);
    expect(readsOf(source, src)).toBe(1);
  });

  it('finishes a load while collapsed and shows the contents when reopened (AC-3)', async () => {
    const gate = deferred();
    const src = dir({ 'a.ts': file() }, { gate: gate.promise });
    const { source, controller } = await pickRoot(dir({ src }));

    const first = controller.toggle('src');
    await flush();
    await controller.toggle('src');
    gate.resolve();
    await first;
    expect(controller.getState().nodes.get('src')?.load).toBe('loaded');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src']);
    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:src', '2:a.ts']);
    expect(readsOf(source, src)).toBe(1);
  });

  it('shows Empty folder at depth + 1 for an empty subfolder (AC-4)', async () => {
    const { controller } = await pickRoot(dir({ empty: dir() }));
    await controller.toggle('empty');
    const rows = selectVisibleRows(controller.getState());
    expect(rows.at(-1)).toMatchObject({ type: 'status', depth: 2, text: TEXT.emptyFolder });
  });

  it('opens nested folders to any depth', async () => {
    const { controller } = await pickRoot(dir({ a: dir({ b: dir({ c: dir({ 'deep.txt': file() }) }) }) }));
    await controller.toggle('a');
    await controller.toggle('a/b');
    await controller.toggle('a/b/c');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:a', '2:b', '3:c', '4:deep.txt']);
  });

  it('does nothing for a file or an unknown id', async () => {
    const { source, controller } = await pickRoot(dir({ 'a.txt': file() }));
    const before = controller.getState();
    await controller.toggle('a.txt');
    await controller.toggle('missing');
    expect(controller.getState()).toBe(before);
    expect(source.calls.listChildren).toHaveLength(1);
  });

  it('does not let a folder from an old root enter the new tree (AC-9)', async () => {
    const gate = deferred();
    const oldSrc = dir({ fromOld: file() }, { gate: gate.promise });
    const source = createFakeSource();
    const { controller } = await pickRoot(dir({ src: oldSrc }), source);

    const pending = controller.toggle('src');
    await flush();
    source.queuePick('other', dir({ src: dir({ fromNew: file() }) }));
    await controller.openFolder();
    const afterNew = controller.getState();
    expect(afterNew.nodes.get('src')?.load).toBe('unloaded');

    gate.resolve();
    await pending;
    expect(controller.getState()).toBe(afterNew);
    expect(controller.getState().nodes.has('src/fromOld')).toBe(false);

    await controller.toggle('src');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:other', '1:src', '2:fromNew']);
  });

  it('drops an old-root result even when the new root has the same folder loading (AC-9, generation guard)', async () => {
    const oldGate = deferred();
    const newGate = deferred();
    const source = createFakeSource();
    const { controller } = await pickRoot(dir({ src: dir({ fromOld: file() }, { gate: oldGate.promise }) }), source);

    const oldPending = controller.toggle('src');
    await flush();
    source.queuePick('other', dir({ src: dir({ fromNew: file() }, { gate: newGate.promise }) }));
    await controller.openFolder();
    const newPending = controller.toggle('src');
    await flush();
    const newLoading = controller.getState();
    expect(newLoading.nodes.get('src')?.load).toBe('loading');

    oldGate.resolve();
    await oldPending;
    expect(controller.getState()).toBe(newLoading);
    expect(controller.getState().nodes.has('src/fromOld')).toBe(false);
    expect(rowsWithDepth(controller.getState())).toEqual(['0:other', '1:src', `2:[${TEXT.loading}]`]);

    newGate.resolve();
    await newPending;
    expect(rowsWithDepth(controller.getState())).toEqual(['0:other', '1:src', '2:fromNew']);
    expect(controller.getState().nodes.has('src/fromOld')).toBe(false);
  });
});

/** A source whose listChildren throws synchronously for one folder. */
function throwingSource(bad: FakeDir): FakeSource {
  const inner = createFakeSource();
  return {
    ...inner,
    listChildren(ref: SourceRef) {
      if ((ref as unknown) === bad) throw new Error('listChildren threw');
      return inner.listChildren(ref);
    },
  };
}

/** A source whose iterator for one folder yields `count` entries and then has next() reject. */
function rejectingNextSource(bad: FakeDir, count: number): FakeSource {
  const inner = createFakeSource();
  return {
    ...inner,
    listChildren(ref: SourceRef): AsyncIterable<Entry> {
      if ((ref as unknown) !== bad) return inner.listChildren(ref);
      const names = Object.keys(bad.children);
      let i = 0;
      return {
        [Symbol.asyncIterator]: () => ({
          next: (): Promise<IteratorResult<Entry>> => {
            if (i >= count) return Promise.reject(new Error('next() rejected'));
            const name = names[i++];
            const child = bad.children[name];
            return Promise.resolve({ done: false, value: { name, kind: child.kind, ref: child as unknown as SourceRef } });
          },
        }),
      };
    },
  };
}

describe('FR-5 unreadable folders', () => {
  it('marks a folder that fails before its first entry, with no chevron and nothing below (AC-5)', async () => {
    const secret = dir({ hidden: file() }, { failAfter: 0 });
    const other = dir({ 'ok.txt': file() });
    const { source, controller } = await pickRoot(dir({ secret, other }));

    await expect(controller.toggle('secret')).resolves.toBeUndefined();
    const state = controller.getState();
    expect(state.nodes.get('secret')?.load).toBe('failed');
    const rows = selectVisibleRows(state);
    expect(rows.find((r) => r.type === 'item' && r.id === 'secret')).toMatchObject({
      chevron: 'none',
      unreadable: true,
      depth: 1,
    });
    expect(rowsWithDepth(state)).toEqual(['0:project', '1:other', '1:secret']);

    await controller.toggle('secret');
    expect(controller.getState()).toBe(state);
    expect(readsOf(source, secret)).toBe(1);

    await controller.toggle('other');
    expect(rowsWithDepth(controller.getState())).toEqual(['0:project', '1:other', '2:ok.txt', '1:secret']);
  });

  it('a failed root shows the message with no chevron and toggling it does not read again (AC-6)', async () => {
    const root = dir({ a: file() }, { failAfter: 0 });
    const { source, controller } = await pickRoot(root);
    const state = controller.getState();
    expect(selectVisibleRows(state)).toEqual([
      expect.objectContaining({ id: ROOT_ID, chevron: 'none', unreadable: true }),
    ]);
    await controller.toggle(ROOT_ID);
    expect(controller.getState()).toBe(state);
    expect(readsOf(source, root)).toBe(1);
  });

  it('keeps the entries of a listing that fails mid-way, with one nameless status row after the whole subtree (AC-7)', async () => {
    const logs = dir({ 'b.log': file(), archive: dir({ 'old.log': file() }), 'c.log': file() }, { failAfter: 2 });
    const { controller } = await pickRoot(dir({ logs, 'z.txt': file() }));
    await controller.toggle('logs');
    await controller.toggle('logs/archive');
    const state = controller.getState();
    expect(state.nodes.get('logs')).toMatchObject({ load: 'loaded', truncated: true });
    expect(rowsWithDepth(state)).toEqual([
      '0:project',
      '1:logs',
      '2:archive',
      '3:old.log',
      '2:b.log',
      `2:[${TEXT.unableToRead}]`,
      '1:z.txt',
    ]);
    const statusRows = selectVisibleRows(state).filter((r) => r.type === 'status');
    expect(statusRows.map((r) => r.text)).not.toContain(TEXT.emptyFolder);
  });

  it('shows the Unable to read status row, not Empty folder, after a single received entry', async () => {
    const logs = dir({ only: file(), more: file() }, { failAfter: 1 });
    const { controller } = await pickRoot(dir({ logs }));
    await controller.toggle('logs');
    expect(rowsWithDepth(controller.getState())).toEqual([
      '0:project',
      '1:logs',
      '2:only',
      `2:[${TEXT.unableToRead}]`,
    ]);
  });
});

describe('FR-5 errors never leak out of toggle (AC-8)', () => {
  async function expectOutcome(
    source: FakeSource,
    root: FakeDir,
    expected: { load: 'failed' } | { load: 'loaded'; truncated: true; children: number },
  ) {
    const { controller } = await pickRoot(root, source);
    await expect(controller.toggle('bad')).resolves.toBeUndefined();
    const bad = controller.getState().nodes.get('bad');
    expect(bad).toMatchObject(expected.load === 'failed' ? { load: 'failed' } : { load: 'loaded', truncated: true });
    if (expected.load === 'loaded') expect(bad?.children).toHaveLength(expected.children);
    // The rest of the tree keeps working.
    await controller.toggle('good');
    expect(controller.getState().nodes.get('good')?.load).toBe('loaded');
    expect(rowLabels(controller.getState())).toContain('fine.txt');
  }

  const good = () => dir({ 'fine.txt': file() });

  it('listChildren itself throws', async () => {
    const bad = dir({ x: file() });
    await expectOutcome(throwingSource(bad), dir({ bad, good: good() }), { load: 'failed' });
  });

  it('failAfter: 0', async () => {
    const bad = dir({ x: file() }, { failAfter: 0 });
    await expectOutcome(createFakeSource(), dir({ bad, good: good() }), { load: 'failed' });
  });

  it('failAfter: N', async () => {
    const bad = dir({ x: file(), y: file(), z: file() }, { failAfter: 2 });
    await expectOutcome(createFakeSource(), dir({ bad, good: good() }), { load: 'loaded', truncated: true, children: 2 });
  });

  it('next() rejects before the first entry', async () => {
    const bad = dir({ x: file(), y: file() });
    await expectOutcome(rejectingNextSource(bad, 0), dir({ bad, good: good() }), { load: 'failed' });
  });

  it('next() rejects after one entry', async () => {
    const bad = dir({ x: file(), y: file() });
    await expectOutcome(rejectingNextSource(bad, 1), dir({ bad, good: good() }), {
      load: 'loaded',
      truncated: true,
      children: 1,
    });
  });

  it('the gate rejects', async () => {
    const gate = deferred();
    gate.reject(new Error('denied'));
    const bad = dir({ x: file() }, { gate: gate.promise });
    await expectOutcome(createFakeSource(), dir({ bad, good: good() }), { load: 'failed' });
  });
});

function itemRow(state: Parameters<typeof selectVisibleRows>[0], name: string): ItemRow {
  const row = selectVisibleRows(state).find((r): r is ItemRow => r.type === 'item' && r.name === name);
  if (!row) throw new Error(`no row ${name}`);
  return row;
}

describe('FR-7 selecting a file (AC-1)', () => {
  it('shows Name + Loading… while reading, then Name/Type/Size/Modified, and marks the row selected', async () => {
    const gate = deferred();
    const modified = Date.UTC(2026, 9, 22, 15, 20);
    const report = file({ size: 1_500, lastModified: modified, gate: gate.promise });
    const { source, controller } = await pickRoot(dir({ 'report.pdf': report }));

    const done = controller.select('report.pdf');
    let state = controller.getState();
    expect(state.selectedId).toBe('report.pdf');
    expect(selectDetails(state)).toEqual({ type: 'loading', name: 'report.pdf' });
    expect(itemRow(state, 'report.pdf').selected).toBe(true);
    expect(source.calls.readFileMeta).toEqual([report]);

    gate.resolve();
    await done;
    state = controller.getState();
    expect(selectDetails(state)).toEqual({
      type: 'file',
      name: 'report.pdf',
      typeLabel: 'PDF',
      size: '1.5 KB',
      modified: formatDate(modified),
    });
    expect(itemRow(state, 'report.pdf').selected).toBe(true);
  });

  it('shows — for an unknown modification date', async () => {
    const { controller } = await pickRoot(dir({ README: file({ size: 3, lastModified: null }) }));
    await controller.select('README');
    expect(selectDetails(controller.getState())).toEqual({
      type: 'file',
      name: 'README',
      typeLabel: TEXT.unknownValue,
      size: '3 B',
      modified: TEXT.unknownValue,
    });
  });

  it('ignores an unknown id', async () => {
    const { source, controller } = await pickRoot(dir({ a: file() }));
    const before = controller.getState();
    await controller.select('nope');
    expect(controller.getState()).toBe(before);
    expect(source.calls.readFileMeta).toEqual([]);
  });
});

describe('FR-8 selecting a folder (AC-5)', () => {
  it('shows only Name and Folder, keeps a closed folder closed and never reads the disk', async () => {
    const src = dir({ 'a.ts': file() });
    const { source, controller } = await pickRoot(dir({ src }));
    const listsBefore = source.calls.listChildren.length;

    await controller.select('src');
    const state = controller.getState();
    expect(state.selectedId).toBe('src');
    expect(state.expanded.has('src')).toBe(false);
    expect(selectDetails(state)).toEqual({ type: 'folder', name: 'src' });
    expect(itemRow(state, 'src').selected).toBe(true);
    expect(source.calls.listChildren).toHaveLength(listsBefore);
    expect(source.calls.readFileMeta).toEqual([]);
  });

  it('keeps an open folder open, including the root', async () => {
    const { source, controller } = await pickRoot(dir({ a: file() }));
    const listsBefore = source.calls.listChildren.length;
    await controller.select(ROOT_ID);
    const state = controller.getState();
    expect(state.expanded.has(ROOT_ID)).toBe(true);
    expect(selectDetails(state)).toEqual({ type: 'folder', name: 'project' });
    expect(rowLabels(state)).toEqual(['project', 'a']);
    expect(source.calls.listChildren).toHaveLength(listsBefore);
  });

  it('re-selecting the selected folder keeps the same reference', async () => {
    const { controller } = await pickRoot(dir({ src: dir() }));
    await controller.select('src');
    const before = controller.getState();
    await controller.select('src');
    expect(controller.getState()).toBe(before);
  });

  it('drops a pending file read when a folder is selected', async () => {
    const gate = deferred();
    const { controller } = await pickRoot(dir({ src: dir(), 'a.txt': file({ gate: gate.promise }) }));
    const done = controller.select('a.txt');
    await controller.select('src');
    const afterFolder = controller.getState();
    gate.resolve();
    await done;
    expect(controller.getState()).toBe(afterFolder);
    expect(selectDetails(afterFolder)).toEqual({ type: 'folder', name: 'src' });
  });
});

describe('FR-3 FR-7 stale file details (AC-6)', () => {
  it('shows B when A was clicked first and its details arrive last', async () => {
    const gateA = deferred();
    const gateB = deferred();
    const { controller } = await pickRoot(
      dir({ 'a.txt': file({ size: 1, gate: gateA.promise }), 'b.txt': file({ size: 2, gate: gateB.promise }) }),
    );
    const doneA = controller.select('a.txt');
    const doneB = controller.select('b.txt');
    gateB.resolve();
    await doneB;
    const afterB = controller.getState();
    expect(selectDetails(afterB)).toMatchObject({ type: 'file', name: 'b.txt', size: '2 B' });

    gateA.resolve();
    await doneA;
    expect(controller.getState()).toBe(afterB);
  });

  it('shows A after A → B → A, whichever read finishes last, and reads A again', async () => {
    const gateA = deferred();
    const gateB = deferred();
    const a = file({ size: 1, gate: gateA.promise });
    const b = file({ size: 2, gate: gateB.promise });
    const { source, controller } = await pickRoot(dir({ 'a.txt': a, 'b.txt': b }));
    const first = controller.select('a.txt');
    const second = controller.select('b.txt');
    const third = controller.select('a.txt');
    expect(source.calls.readFileMeta).toEqual([a, b, a]);
    expect(selectDetails(controller.getState())).toEqual({ type: 'loading', name: 'a.txt' });

    gateB.resolve();
    await second;
    expect(selectDetails(controller.getState())).toEqual({ type: 'loading', name: 'a.txt' });
    gateA.resolve();
    await Promise.all([first, third]);
    expect(selectDetails(controller.getState())).toMatchObject({ type: 'file', name: 'a.txt', size: '1 B' });
  });

  it('selecting the selected file keeps the same reference and does not read again', async () => {
    const a = file({ size: 1 });
    const { source, controller } = await pickRoot(dir({ 'a.txt': a }));
    await controller.select('a.txt');
    const before = controller.getState();
    const listener = vi.fn();
    controller.subscribe(listener);
    await controller.select('a.txt');
    expect(controller.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(source.calls.readFileMeta).toEqual([a]);
  });

  it('selecting the selected file while it is still loading does not read again', async () => {
    const gate = deferred();
    const a = file({ gate: gate.promise });
    const { source, controller } = await pickRoot(dir({ 'a.txt': a }));
    const done = controller.select('a.txt');
    await controller.select('a.txt');
    expect(source.calls.readFileMeta).toEqual([a]);
    gate.resolve();
    await done;
    expect(selectDetails(controller.getState())).toMatchObject({ type: 'file', name: 'a.txt' });
  });
});

describe('FR-5 unreadable files (AC-7, AC-8)', () => {
  it('marks a file whose read fails, clears the selection and empties the panel', async () => {
    const { controller } = await pickRoot(dir({ 'locked.txt': file({ failMeta: true }) }));
    await controller.select('locked.txt');
    const state = controller.getState();
    expect(itemRow(state, 'locked.txt')).toMatchObject({ unreadable: true, selected: false });
    expect(state.selectedId).toBeNull();
    expect(selectDetails(state)).toEqual({ type: 'empty' });
  });

  it('only marks the file when another file was selected in the meantime', async () => {
    const gate = deferred();
    const { controller } = await pickRoot(
      dir({ 'locked.txt': file({ failMeta: true, gate: gate.promise }), 'ok.txt': file({ size: 5 }) }),
    );
    const doneLocked = controller.select('locked.txt');
    await controller.select('ok.txt');
    gate.resolve();
    await doneLocked;
    const state = controller.getState();
    expect(itemRow(state, 'locked.txt').unreadable).toBe(true);
    expect(state.selectedId).toBe('ok.txt');
    expect(selectDetails(state)).toMatchObject({ type: 'file', name: 'ok.txt', size: '5 B' });
  });

  it('clears the selection and does not read again when a known unreadable file is clicked', async () => {
    const locked = file({ failMeta: true });
    const { source, controller } = await pickRoot(dir({ 'locked.txt': locked, 'ok.txt': file() }));
    await controller.select('locked.txt');
    await controller.select('ok.txt');
    expect(controller.getState().selectedId).toBe('ok.txt');

    await controller.select('locked.txt');
    const state = controller.getState();
    expect(state.selectedId).toBeNull();
    expect(selectDetails(state)).toEqual({ type: 'empty' });
    expect(source.calls.readFileMeta.filter((f) => f === locked)).toHaveLength(1);
  });

  it('clears the selection and does not read again when a failed folder is clicked', async () => {
    const blocked = dir({ x: file() }, { failAfter: 0 });
    const { source, controller } = await pickRoot(dir({ blocked, 'ok.txt': file() }));
    await controller.toggle('blocked');
    await controller.select('ok.txt');
    const reads = source.calls.listChildren.length;

    await controller.select('blocked');
    const state = controller.getState();
    expect(state.selectedId).toBeNull();
    expect(selectDetails(state)).toEqual({ type: 'empty' });
    expect(source.calls.listChildren).toHaveLength(reads);
  });

  it('select never rejects, even when readFileMeta throws synchronously', async () => {
    const source = createFakeSource();
    source.readFileMeta = () => {
      throw new Error('sync boom');
    };
    const { controller } = await pickRoot(dir({ 'a.txt': file() }), source);
    await expect(controller.select('a.txt')).resolves.toBeUndefined();
    expect(itemRow(controller.getState(), 'a.txt').unreadable).toBe(true);
  });
});

describe('FR-3 FR-5 hidden selection (AC-9)', () => {
  it('keeps a file selected with its details when its parent is collapsed', async () => {
    const { controller } = await pickRoot(dir({ src: dir({ 'a.ts': file({ size: 10 }) }) }));
    await controller.toggle('src');
    await controller.select('src/a.ts');
    const details = selectDetails(controller.getState());
    expect(details).toMatchObject({ type: 'file', name: 'a.ts' });

    await controller.toggle('src');
    const state = controller.getState();
    expect(rowLabels(state)).toEqual(['project', 'src']);
    expect(state.selectedId).toBe('src/a.ts');
    expect(selectDetails(state)).toEqual(details);
  });

  it('keeps a selected folder selected when it then fails to open', async () => {
    const { controller } = await pickRoot(dir({ blocked: dir({ x: file() }, { failAfter: 0 }) }));
    await controller.select('blocked');
    await controller.toggle('blocked');
    const state = controller.getState();
    expect(state.nodes.get('blocked')?.load).toBe('failed');
    expect(state.selectedId).toBe('blocked');
    expect(selectDetails(state)).toEqual({ type: 'folder', name: 'blocked' });
  });
});

describe('FR-1 FR-6 root replacement clears the selection (AC-10)', () => {
  it('resets the panel and drops details of the old root that arrive later', async () => {
    const gate = deferred();
    const root = dir({ 'a.txt': file({ gate: gate.promise }) });
    const { source, controller } = await pickRoot(root);
    const done = controller.select('a.txt');

    source.queuePick('project', root);
    await controller.openFolder();
    const afterPick = controller.getState();
    expect(afterPick.selectedId).toBeNull();
    expect(selectDetails(afterPick)).toEqual({ type: 'empty' });

    gate.resolve();
    await done;
    expect(controller.getState()).toBe(afterPick);
  });

  it('drops a failure of the old root: the new tree is not marked', async () => {
    const gate = deferred();
    const root = dir({ 'a.txt': file({ failMeta: true, gate: gate.promise }) });
    const { source, controller } = await pickRoot(root);
    const done = controller.select('a.txt');
    source.queuePick('project', root);
    await controller.openFolder();
    const afterPick = controller.getState();
    gate.resolve();
    await done;
    expect(controller.getState()).toBe(afterPick);
    expect(itemRow(afterPick, 'a.txt').unreadable).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createController } from './controller.ts';
import { selectVisibleRows } from './selectors.ts';
import type { ItemRow } from './selectors.ts';
import { ROOT_ID } from './state.ts';
import { TEXT } from './text.ts';
import { createFakeSource, deferred, dir, file, flush } from '../test/fakeSource.ts';

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

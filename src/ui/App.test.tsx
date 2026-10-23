import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createController } from '../lib/controller.ts';
import { TEXT } from '../lib/text.ts';
import { createFakeSource, deferred, dir, file } from '../test/fakeSource.ts';
import { App } from './App.tsx';

afterEach(() => {
  cleanup();
});

describe('FR-1 Open folder button', () => {
  it('calls openFolder and shows the root in the top bar and the tree', async () => {
    const source = createFakeSource();
    const controller = createController(source);
    const openFolder = vi.spyOn(controller, 'openFolder');
    source.queuePick('דוח סופי (2)', dir({ 'a.txt': file() }));
    const { container } = render(<App controller={controller} />);

    await userEvent.setup().click(screen.getByRole('button', { name: TEXT.openFolder }));

    expect(openFolder).toHaveBeenCalledOnce();
    expect(await screen.findByText('a.txt')).toBeTruthy();
    const rootName = container.querySelector('.root-name');
    expect(rootName?.textContent).toBe('דוח סופי (2)');
    expect(rootName?.getAttribute('dir')).toBe('ltr');
    expect(rootName?.classList.contains('bidi-isolate')).toBe(true);
    const treeName = container.querySelector('.tree-row[data-depth="0"] .tree-name');
    expect(treeName?.textContent).toBe('דוח סופי (2)');
    expect(treeName?.getAttribute('dir')).toBe('ltr');
    expect(treeName?.classList.contains('bidi-isolate')).toBe(true);
  });
});

describe('FR-2 unsupported browser', () => {
  it('shows only the message and no button', () => {
    render(<App controller={createController(createFakeSource({ supported: false }))} />);
    expect(screen.getByText(TEXT.unsupportedBrowser)).toBeTruthy();
    expect(screen.queryByRole('button', { name: TEXT.openFolder })).toBeNull();
  });
});

describe('FR-6 before a root is picked', () => {
  it('shows the button, an empty tree and the details prompt', () => {
    const { container } = render(<App controller={createController(createFakeSource())} />);
    expect(screen.getByRole('button', { name: TEXT.openFolder })).toBeTruthy();
    expect(container.querySelector('.root-name')).toBeNull();
    expect(container.querySelector('.tree')?.textContent).toBe('');
    expect(screen.getByText(TEXT.selectFilePrompt)).toBeTruthy();
  });
});

describe('FR-3 tree rows', () => {
  async function pick(root: ReturnType<typeof dir>) {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('project', root);
    const view = render(<App controller={controller} />);
    await userEvent.setup().click(screen.getByRole('button', { name: TEXT.openFolder }));
    return view;
  }

  it('shows Loading… under the root until its contents arrive', async () => {
    const gate = deferred();
    await pick(dir({ 'a.txt': file() }, { gate: gate.promise }));
    expect(await screen.findByText(TEXT.loading)).toBeTruthy();
    expect(screen.queryByText('a.txt')).toBeNull();
    gate.resolve();
    expect(await screen.findByText('a.txt')).toBeTruthy();
    expect(screen.queryByText(TEXT.loading)).toBeNull();
  });

  it('gives a folder child a chevron button and a file child a spacer, at depth 1', async () => {
    const { container } = await pick(dir({ 'a.txt': file(), src: dir() }));
    await screen.findByText('a.txt');
    const rows = [...container.querySelectorAll('.tree-row[data-depth="1"]')];
    const folderRow = rows.find((r) => r.querySelector('.tree-name')?.textContent === 'src');
    const fileRow = rows.find((r) => r.querySelector('.tree-name')?.textContent === 'a.txt');
    expect(folderRow?.querySelector('button.tree-chevron')).not.toBeNull();
    expect(folderRow?.querySelector('.tree-chevron-spacer')).toBeNull();
    expect(fileRow?.querySelector('.tree-chevron-spacer')).not.toBeNull();
    expect(fileRow?.querySelector('.tree-chevron')).toBeNull();
  });

  it('shows Empty folder for an empty root', async () => {
    await pick(dir());
    expect(await screen.findByText(TEXT.emptyFolder)).toBeTruthy();
  });

  it('shows Unable to read this item in the root row when the read fails before the first entry', async () => {
    const { container } = await pick(dir({ 'a.txt': file() }, { failAfter: 0 }));
    expect(await screen.findByText(TEXT.unableToRead)).toBeTruthy();
    const rootRow = container.querySelector('.tree-row[data-depth="0"]');
    expect(rootRow?.textContent).toContain(TEXT.unableToRead);
    expect(rootRow?.querySelector('.tree-chevron')).toBeNull();
  });
});

describe('FR-3 FR-5 chevron and row structure', () => {
  async function setup(root: ReturnType<typeof dir>) {
    const source = createFakeSource();
    const controller = createController(source);
    const toggle = vi.spyOn(controller, 'toggle');
    source.queuePick('project', root);
    const view = render(<App controller={controller} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: TEXT.openFolder }));
    await screen.findByText('src');
    return { ...view, user, controller, toggle, source };
  }

  function rowOf(container: HTMLElement, name: string): Element {
    const row = [...container.querySelectorAll('.tree-row')].find(
      (r) => r.querySelector('.tree-name')?.textContent === name,
    );
    if (!row) throw new Error(`no row ${name}`);
    return row;
  }

  it('opens and closes a folder from its chevron, without selecting it (AC-1)', async () => {
    const gate = deferred();
    const { container, user, controller, toggle } = await setup(
      dir({ src: dir({ 'b.ts': file(), 'a.ts': file() }, { gate: gate.promise }) }),
    );
    const chevron = rowOf(container, 'src').querySelector('button.tree-chevron') as HTMLElement;

    await user.click(chevron);
    expect(toggle).toHaveBeenCalledWith('src');
    const loading = await screen.findByText(TEXT.loading);
    expect(loading.closest('.status-row')?.getAttribute('data-depth')).toBe('2');

    gate.resolve();
    expect(await screen.findByText('a.ts')).toBeTruthy();
    expect(rowOf(container, 'a.ts').getAttribute('data-depth')).toBe('2');
    expect([...container.querySelectorAll('.tree-name')].map((n) => n.textContent)).toEqual([
      'project',
      'src',
      'a.ts',
      'b.ts',
    ]);
    expect(controller.getState().selectedId).toBeNull();

    await user.click(rowOf(container, 'src').querySelector('button.tree-chevron') as HTMLElement);
    expect(screen.queryByText('a.ts')).toBeNull();
    expect(controller.getState().selectedId).toBeNull();
  });

  it('does not toggle when the name is clicked', async () => {
    const { container, user, toggle } = await setup(dir({ src: dir({ 'a.ts': file() }) }));
    await user.click(rowOf(container, 'src').querySelector('.tree-name-button') as HTMLElement);
    expect(toggle).not.toHaveBeenCalled();
    expect(screen.queryByText('a.ts')).toBeNull();
  });

  it('gives every row a chevron button or a spacer and a name button, with depth only in data-depth (AC-10)', async () => {
    const { container, user } = await setup(
      dir({
        src: dir({ lib: dir({ 'deep.ts': file() }), 'index.ts': file() }),
        logs: dir({ 'a.log': file(), 'b.log': file(), 'c.log': file() }, { failAfter: 2 }),
        'secret-folder-with-a-very-long-name-that-does-not-fit': dir({ x: file() }, { failAfter: 0 }),
        'a-very-long-file-name-that-would-not-fit-in-the-tree.txt': file(),
      }),
    );
    const longSecret = 'secret-folder-with-a-very-long-name-that-does-not-fit';
    await user.click(rowOf(container, 'src').querySelector('button.tree-chevron') as HTMLElement);
    await user.click((await screen.findByText('lib')).closest('.tree-row')?.querySelector('button.tree-chevron') as HTMLElement);
    await screen.findByText('deep.ts');
    await user.click(rowOf(container, 'logs').querySelector('button.tree-chevron') as HTMLElement);
    await screen.findByText('b.log');
    await user.click(rowOf(container, longSecret).querySelector('button.tree-chevron') as HTMLElement);
    await screen.findByText(TEXT.unableToRead, { selector: '.unreadable-message' });

    const longName = 'a-very-long-file-name-that-would-not-fit-in-the-tree.txt';
    const expected: Array<[string, string, 'chevron' | 'spacer']> = [
      ['project', '0', 'chevron'],
      ['logs', '1', 'chevron'],
      ['a.log', '2', 'spacer'],
      ['b.log', '2', 'spacer'],
      [longSecret, '1', 'spacer'],
      ['src', '1', 'chevron'],
      ['lib', '2', 'chevron'],
      ['deep.ts', '3', 'spacer'],
      ['index.ts', '2', 'spacer'],
      [longName, '1', 'spacer'],
    ];
    const rows = [...container.querySelectorAll('.tree-row')];
    expect(rows.map((r) => r.querySelector('.tree-name')?.textContent)).toEqual(expected.map(([name]) => name));
    rows.forEach((row, i) => {
      const [, depth, lead] = expected[i];
      expect(row.getAttribute('data-depth')).toBe(depth);
      expect(row.children).toHaveLength(2);
      expect(row.children[0].matches(lead === 'chevron' ? 'button.tree-chevron' : 'span.tree-chevron-spacer')).toBe(true);
      expect(row.children[1].matches('button.tree-name-button')).toBe(true);
    });

    // The failed folder: spacer, message next to the name, nothing below it.
    const secret = rowOf(container, longSecret);
    expect(secret.querySelector('.tree-chevron-spacer')).not.toBeNull();
    expect(secret.querySelector('.tree-name-button .unreadable-message')?.textContent).toBe(TEXT.unableToRead);
    expect(secret.nextElementSibling?.querySelector('.tree-name')?.textContent).toBe('src');

    // The truncated folder: one nameless status row after its subtree.
    const logsStatus = rowOf(container, 'b.log').nextElementSibling;
    expect(logsStatus?.matches('.status-row[data-depth="2"]')).toBe(true);
    expect(logsStatus?.textContent).toBe(TEXT.unableToRead);
    expect(logsStatus?.querySelector('button, .tree-name')).toBeNull();

    // No inline style anywhere, and no sizing attributes on any SVG.
    expect(container.querySelector('[style]')).toBeNull();
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      for (const attr of ['width', 'height', 'stroke-width']) expect(svg.hasAttribute(attr)).toBe(false);
      for (const el of svg.querySelectorAll('*')) {
        for (const attr of ['width', 'height', 'stroke-width']) expect(el.hasAttribute(attr)).toBe(false);
      }
    }
  });

  it('shows Empty folder at depth + 1 with no button (AC-4)', async () => {
    const { container, user } = await setup(dir({ src: dir() }));
    await user.click(rowOf(container, 'src').querySelector('button.tree-chevron') as HTMLElement);
    const status = (await screen.findByText(TEXT.emptyFolder)).closest('.status-row');
    expect(status?.getAttribute('data-depth')).toBe('2');
    expect(status?.querySelector('button')).toBeNull();
  });
});

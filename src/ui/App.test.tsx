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

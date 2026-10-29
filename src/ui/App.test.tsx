import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createController } from '../lib/controller.ts';
import { TEXT } from '../lib/text.ts';
import { createFakeSource, deferred, dir, file } from '../test/fakeSource.ts';
import type { Deferred, FakeDir } from '../test/fakeSource.ts';
import { App } from './App.tsx';
import { PreviewPane } from './PreviewPane.tsx';

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

describe('FR-3 FR-6 FR-7 FR-8 selecting from the tree', () => {
  const hebrewName = 'דוח רבעוני מסכם עם שם ארוך מאוד שלא נכנס בשורה אחת.pdf';

  async function setup(root: ReturnType<typeof dir>) {
    const source = createFakeSource();
    const controller = createController(source);
    const toggle = vi.spyOn(controller, 'toggle');
    const select = vi.spyOn(controller, 'select');
    source.queuePick('project', root);
    const view = render(<App controller={controller} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: TEXT.openFolder }));
    await screen.findByText('src');
    return { ...view, user, controller, toggle, select, source };
  }

  function nameButton(container: HTMLElement, name: string): HTMLElement {
    const row = [...container.querySelectorAll('.tree-row')].find(
      (r) => r.querySelector('.tree-name')?.textContent === name,
    );
    if (!row) throw new Error(`no row ${name}`);
    return row.querySelector('.tree-name-button') as HTMLElement;
  }

  function panelPairs(container: HTMLElement): string[][] {
    return [...container.querySelectorAll('.details-panel .details-row')].map((r) => [
      r.querySelector('dt')?.textContent ?? '',
      r.querySelector('dd')?.textContent ?? '',
    ]);
  }

  it('selects a file from its name: Loading… first, then Name/Type/Size/Modified in order (AC-1, AC-11)', async () => {
    const gate = deferred();
    const { container, user, select, toggle } = await setup(
      dir({ src: dir(), [hebrewName]: file({ size: 1500, lastModified: null, gate: gate.promise }) }),
    );
    await user.click(nameButton(container, hebrewName));
    expect(select).toHaveBeenCalledWith(hebrewName);
    expect(toggle).not.toHaveBeenCalled();

    const row = nameButton(container, hebrewName).closest('.tree-row');
    expect(row?.classList.contains('tree-row--selected')).toBe(true);
    expect(container.querySelectorAll('.tree-row--selected')).toHaveLength(1);
    expect(panelPairs(container)).toEqual([[TEXT.labelName, hebrewName]]);
    expect(container.querySelector('.details-panel .status-row-text')?.textContent).toBe(TEXT.loading);

    gate.resolve();
    await screen.findByText('1.5 KB');
    expect(panelPairs(container)).toEqual([
      [TEXT.labelName, hebrewName],
      [TEXT.labelType, 'PDF'],
      [TEXT.labelSize, '1.5 KB'],
      [TEXT.labelModified, TEXT.unknownValue],
    ]);
    const panelName = container.querySelector('.details-panel .details-name');
    expect(panelName?.getAttribute('dir')).toBe('ltr');
    expect(panelName?.classList.contains('bidi-isolate')).toBe(true);
    expect(container.querySelector('.details-panel')?.textContent).not.toContain(TEXT.loading);
  });

  it('selects a folder from its name without opening it (AC-5)', async () => {
    const { container, user, toggle, source } = await setup(dir({ src: dir({ 'a.ts': file() }) }));
    await user.click(nameButton(container, 'src'));
    expect(toggle).not.toHaveBeenCalled();
    expect(screen.queryByText('a.ts')).toBeNull();
    expect(source.calls.readFileMeta).toHaveLength(0);
    expect(panelPairs(container)).toEqual([
      [TEXT.labelName, 'src'],
      [TEXT.labelType, TEXT.typeFolder],
    ]);
  });

  it('returns to the prompt when a file read fails, and shows the message next to its name (AC-7)', async () => {
    const { container, user } = await setup(dir({ src: dir(), 'locked.txt': file({ failMeta: true }) }));
    await user.click(nameButton(container, 'locked.txt'));
    expect(await screen.findByText(TEXT.unableToRead)).toBeTruthy();
    expect(nameButton(container, 'locked.txt').textContent).toContain(TEXT.unableToRead);
    expect(container.querySelector('.tree-row--selected')).toBeNull();
    expect(screen.getByText(TEXT.selectFilePrompt)).toBeTruthy();
  });

  it('keeps no inline style in the panel', async () => {
    const { container, user } = await setup(dir({ src: dir(), 'a.txt': file({ size: 10 }) }));
    await user.click(nameButton(container, 'a.txt'));
    await screen.findByText('10 B');
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('image preview pane', () => {
  // jsdom has no object URLs: record what is created and revoked.
  let created: Blob[] = [];
  let revoked: string[] = [];
  // jsdom has no decode(): it resolves at once, or waits for the test when `manualDecode`.
  let decodes: { src: string | null; gate: Deferred }[] = [];
  let manualDecode = false;
  const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');

  beforeEach(() => {
    created = [];
    revoked = [];
    decodes = [];
    manualDecode = false;
    HTMLImageElement.prototype.decode = function decode(this: HTMLImageElement) {
      if (!manualDecode) return Promise.resolve();
      const gate = deferred();
      decodes.push({ src: this.getAttribute('src'), gate });
      return gate.promise;
    };
    URL.createObjectURL = vi.fn((content: Blob | MediaSource) => {
      created.push(content as Blob);
      return `blob:test/${created.length}`;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
    else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
  });

  /** Lets pending promises and the effects they trigger run. */
  const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  const shownSrc = (container: HTMLElement) =>
    [...container.querySelectorAll('.preview-pane img')].map((img) => img.getAttribute('src'));

  async function setup(root: FakeDir) {
    const source = createFakeSource();
    const controller = createController(source);
    source.queuePick('project', root);
    const view = render(<App controller={controller} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: TEXT.openFolder }));
    await waitFor(() => expect(view.container.querySelectorAll('.tree-row').length).toBeGreaterThan(1));
    const clickName = async (name: string) => {
      const row = [...view.container.querySelectorAll('.tree-row')].find(
        (r) => r.querySelector('.tree-name')?.textContent === name,
      );
      if (!row) throw new Error(`no row ${name}`);
      await user.click(row.querySelector('.tree-name-button') as HTMLElement);
    };
    return { ...view, clickName, source };
  }

  const pane = (container: HTMLElement) => container.querySelector('.app-side .preview-pane');
  const withPreview = (container: HTMLElement) =>
    container.querySelector('.app-side')?.classList.contains('app-side--with-preview') ?? false;

  it('shows Loading… and then exactly one <img> with a blob: URL, next to the details (photo.JPG)', async () => {
    const gate = deferred();
    const { container, clickName } = await setup(
      dir({ 'photo.JPG': file({ size: 1500, content: new Blob(['jpeg']), readGate: gate.promise }) }),
    );
    expect(withPreview(container)).toBe(false);
    expect(pane(container)).toBeNull();

    await clickName('photo.JPG');
    expect(withPreview(container)).toBe(true);
    expect(pane(container)?.textContent).toBe(TEXT.loading);
    expect(pane(container)?.querySelector('img')).toBeNull();

    gate.resolve();
    await waitFor(() => expect(pane(container)?.querySelector('img')).not.toBeNull());
    const images = container.querySelectorAll('.preview-pane img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toMatch(/^blob:/);
    expect(container.querySelector('object, iframe, embed')).toBeNull();
    expect(pane(container)?.textContent).toBe('');
    expect(await created[0].text()).toBe('jpeg');
    expect(created[0].type).toBe('image/jpeg');
    expect(container.querySelector('.app-side .details-panel')?.textContent).toContain('1.5 KB');
    expect(container.querySelector('[style]')).toBeNull();
  });

  it.each([
    ['notes.txt', file()],
    ['.png', file()],
    ['pics.png', dir()],
  ])('shows no preview column for %s', async (name, node) => {
    const { container, clickName } = await setup(dir({ [name]: node }));
    await clickName(name);
    await waitFor(() => expect(container.querySelector('.details-panel .details-row')).not.toBeNull());
    expect(pane(container)).toBeNull();
    expect(withPreview(container)).toBe(false);
    expect(created).toEqual([]);
  });

  it('wraps an svg in a Blob typed image/svg+xml from its extension', async () => {
    const { container, clickName } = await setup(dir({ 'logo.svg': file({ content: new Blob(['<svg/>']) }) }));
    await clickName('logo.svg');
    await waitFor(() => expect(pane(container)?.querySelector('img')).not.toBeNull());
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('image/svg+xml');
  });

  it('shows Unable to display this file when the <img> fails after decoding, and resets on the next image', async () => {
    const { container, clickName } = await setup(dir({ 'broken.png': file(), 'ok.png': file() }));
    await clickName('broken.png');
    await waitFor(() => expect(pane(container)?.querySelector('img')).not.toBeNull());
    fireEvent.error(pane(container)!.querySelector('img')!);
    expect(pane(container)?.querySelector('img')).toBeNull();
    expect(pane(container)?.textContent).toBe(TEXT.unableToDisplay);

    await clickName('ok.png');
    await waitFor(() => expect(pane(container)?.querySelector('img')).not.toBeNull());
    expect(pane(container)?.textContent).not.toContain(TEXT.unableToDisplay);
  });

  it('a message does not stick to the next image (no remount in between)', async () => {
    const { container, rerender } = render(
      <PreviewPane view={{ type: 'image', blob: new Blob(['a']), mime: 'image/png', held: false }} />,
    );
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    fireEvent.error(container.querySelector('img')!);
    expect(container.textContent).toBe(TEXT.unableToDisplay);
    rerender(<PreviewPane view={{ type: 'image', blob: new Blob(['b']), mime: 'image/png', held: false }} />);
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:test/2'));
    expect(container.textContent).not.toContain(TEXT.unableToDisplay);
  });

  it('A → B: A stays, with no Loading…, until B is decoded; then one <img> with B', async () => {
    const gateB = deferred();
    const { container, clickName } = await setup(
      dir({ 'a.png': file({ content: new Blob(['A']) }), 'b.png': file({ content: new Blob(['B']), readGate: gateB.promise }) }),
    );
    manualDecode = true;
    await clickName('a.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    expect(pane(container)?.textContent).toBe(TEXT.loading);
    expect(shownSrc(container)).toEqual([]);
    decodes[0].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/1']));

    await clickName('b.png');
    expect(shownSrc(container)).toEqual(['blob:test/1']);
    expect(pane(container)?.textContent).toBe('');
    gateB.resolve();
    await waitFor(() => expect(decodes).toHaveLength(2));
    expect(decodes[1].src).toBe('blob:test/2');
    expect(await created[1].text()).toBe('B');
    expect(shownSrc(container)).toEqual(['blob:test/1']);
    expect(pane(container)?.textContent).toBe('');
    expect(revoked).toEqual([]);

    decodes[1].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/2']));
    expect(revoked).toEqual(['blob:test/1']);
  });

  it('shows Unable to display this file when decode() fails, and frees its URL', async () => {
    const { container, clickName } = await setup(dir({ 'broken.png': file() }));
    manualDecode = true;
    await clickName('broken.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].gate.reject(new Error('EncodingError'));
    await screen.findByText(TEXT.unableToDisplay);
    expect(shownSrc(container)).toEqual([]);
    expect(revoked).toEqual(['blob:test/1']);
  });

  it('message → image: the message stays until the next image is decoded', async () => {
    const gateB = deferred();
    const { container, clickName } = await setup(
      dir({ 'a.png': file({ failRead: true }), 'b.png': file({ readGate: gateB.promise }) }),
    );
    manualDecode = true;
    await clickName('a.png');
    await screen.findByText(TEXT.unableToDisplay);

    await clickName('b.png');
    expect(pane(container)?.textContent).toBe(TEXT.unableToDisplay);
    gateB.resolve();
    await waitFor(() => expect(decodes).toHaveLength(1));
    expect(pane(container)?.textContent).toBe(TEXT.unableToDisplay);
    expect(shownSrc(container)).toEqual([]);

    decodes[0].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/1']));
    expect(pane(container)?.textContent).toBe('');
  });

  it('a failed decode is replaced by the next image only once that one is decoded', async () => {
    const { container, clickName } = await setup(dir({ 'a.png': file(), 'b.png': file() }));
    manualDecode = true;
    await clickName('a.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].gate.reject(new Error('EncodingError'));
    await screen.findByText(TEXT.unableToDisplay);

    await clickName('b.png');
    await waitFor(() => expect(decodes).toHaveLength(2));
    expect(pane(container)?.textContent).toBe(TEXT.unableToDisplay);
    decodes[1].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/2']));
    expect(pane(container)?.textContent).toBe('');
  });

  it('image → failed read → image: the message replaces A at once (A freed) and stays until C is decoded', async () => {
    const gateC = deferred();
    const { container, clickName } = await setup(
      dir({ 'a.png': file(), 'b.png': file({ failRead: true }), 'c.png': file({ readGate: gateC.promise }) }),
    );
    manualDecode = true;
    await clickName('a.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/1']));

    await clickName('b.png');
    await screen.findByText(TEXT.unableToDisplay);
    expect(shownSrc(container)).toEqual([]);
    expect(revoked).toEqual(['blob:test/1']);

    await clickName('c.png');
    gateC.resolve();
    await waitFor(() => expect(decodes).toHaveLength(2));
    expect(shownSrc(container)).toEqual([]);
    expect(pane(container)?.textContent).toBe(TEXT.unableToDisplay);

    decodes[1].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/2']));
    expect(pane(container)?.textContent).toBe('');
  });

  it('X → B → C with B decoded late: B is never shown, X stays until C is decoded', async () => {
    const gateC = deferred();
    const { container, clickName } = await setup(
      dir({ 'x.png': file(), 'b.png': file(), 'c.png': file({ readGate: gateC.promise }) }),
    );
    manualDecode = true;
    await clickName('x.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/1']));

    await clickName('b.png');
    await waitFor(() => expect(decodes).toHaveLength(2));
    await clickName('c.png');
    decodes[1].gate.resolve();
    await flush();
    expect(shownSrc(container)).toEqual(['blob:test/1']);
    expect(revoked).toEqual(['blob:test/2']);

    gateC.resolve();
    await waitFor(() => expect(decodes).toHaveLength(3));
    expect(shownSrc(container)).toEqual(['blob:test/1']);
    expect(pane(container)?.textContent).toBe('');
    decodes[2].gate.resolve();
    await waitFor(() => expect(shownSrc(container)).toEqual(['blob:test/3']));
    expect(revoked).toEqual(['blob:test/2', 'blob:test/1']);
  });

  it('a decode still pending when the column goes away frees its URL when it ends', async () => {
    const { container, clickName } = await setup(dir({ src: dir(), 'a.png': file() }));
    manualDecode = true;
    await clickName('a.png');
    await waitFor(() => expect(decodes).toHaveLength(1));
    await clickName('src');
    expect(pane(container)).toBeNull();
    decodes[0].gate.resolve();
    await flush();
    expect(revoked).toEqual(['blob:test/1']);
    expect(pane(container)).toBeNull();
  });

  it('shows Unable to display this file when readFile rejects but the details load', async () => {
    const { container, clickName } = await setup(dir({ 'a.png': file({ size: 10, failRead: true }) }));
    await clickName('a.png');
    await screen.findByText(TEXT.unableToDisplay);
    expect(pane(container)?.querySelector('img')).toBeNull();
    expect(container.querySelector('.details-panel')?.textContent).toContain('10 B');
  });

  it('removes the column when the file turns out unreadable', async () => {
    const gate = deferred();
    const { container, clickName } = await setup(dir({ 'a.png': file({ failMeta: true, gate: gate.promise }) }));
    await clickName('a.png');
    await waitFor(() => expect(pane(container)?.querySelector('img')?.getAttribute('src')).toBe('blob:test/1'));
    expect(created).toHaveLength(1);
    expect(revoked).toEqual([]);

    gate.resolve();
    await screen.findByText(TEXT.unableToRead);
    expect(pane(container)).toBeNull();
    expect(withPreview(container)).toBe(false);
    expect(revoked).toEqual(['blob:test/1']);
  });

  it('A then B with A arriving last: shows only B', async () => {
    const gateA = deferred();
    const { container, clickName } = await setup(
      dir({ 'a.png': file({ content: new Blob(['A']), readGate: gateA.promise }), 'b.png': file({ content: new Blob(['B']) }) }),
    );
    await clickName('a.png');
    await clickName('b.png');
    await waitFor(() => expect(pane(container)?.querySelector('img')).not.toBeNull());
    gateA.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(created).toHaveLength(1);
    expect(await created[0].text()).toBe('B');
    expect(container.querySelectorAll('.preview-pane img')).toHaveLength(1);
  });

  it('revokes the old object URL when the image changes, and the last one when the column goes away', async () => {
    const { container, clickName } = await setup(dir({ src: dir(), 'a.png': file(), 'b.gif': file() }));
    await clickName('a.png');
    await waitFor(() => expect(pane(container)?.querySelector('img')?.getAttribute('src')).toBe('blob:test/1'));
    expect(revoked).toEqual([]);

    await clickName('b.gif');
    await waitFor(() => expect(pane(container)?.querySelector('img')?.getAttribute('src')).toBe('blob:test/2'));
    expect(revoked).toEqual(['blob:test/1']);

    await clickName('src');
    expect(pane(container)).toBeNull();
    expect(withPreview(container)).toBe(false);
    expect(revoked).toEqual(['blob:test/1', 'blob:test/2']);
  });

  it('removes the column and drops late content when a new root is picked', async () => {
    const gate = deferred();
    const source = createFakeSource();
    const controller = createController(source);
    const root = dir({ 'a.png': file({ readGate: gate.promise }) });
    source.queuePick('project', root);
    const { container } = render(<App controller={controller} />);
    await controller.openFolder();
    void controller.select('a.png');
    await screen.findByText(TEXT.loading);
    expect(withPreview(container)).toBe(true);

    source.queuePick('other', dir({ 'b.txt': file() }));
    await controller.openFolder();
    await screen.findByText('b.txt');
    expect(pane(container)).toBeNull();
    gate.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pane(container)).toBeNull();
    expect(created).toEqual([]);
  });
});

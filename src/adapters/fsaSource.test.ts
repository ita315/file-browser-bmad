import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFsaSource } from './fsaSource.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeHandle(name: string, kind: 'file' | 'directory', extra: object = {}) {
  return { name, kind, ...extra };
}

describe('FR-2 fsaSource.isSupported', () => {
  it('is false without showDirectoryPicker', () => {
    vi.stubGlobal('showDirectoryPicker', undefined);
    expect(createFsaSource().isSupported()).toBe(false);
  });

  it('is true when showDirectoryPicker is a function', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn());
    expect(createFsaSource().isSupported()).toBe(true);
  });
});

describe('FR-1 fsaSource.pickRoot', () => {
  it('opens the picker read-only and returns the folder', async () => {
    const handle = fakeHandle('project', 'directory');
    const picker = vi.fn().mockResolvedValue(handle);
    vi.stubGlobal('showDirectoryPicker', picker);
    const entry = await createFsaSource().pickRoot();
    expect(picker).toHaveBeenCalledWith({ mode: 'read' });
    expect(entry).toMatchObject({ name: 'project', kind: 'directory' });
  });

  it.each([
    ['cancel', new DOMException('aborted', 'AbortError')],
    ['blocked folder', new DOMException('blocked', 'SecurityError')],
    ['denied', new DOMException('denied', 'NotAllowedError')],
  ])('returns null on %s', async (_label, error) => {
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(error));
    await expect(createFsaSource().pickRoot()).resolves.toBeNull();
  });

  it('returns null when the picker throws synchronously', async () => {
    vi.stubGlobal(
      'showDirectoryPicker',
      vi.fn(() => {
        throw new TypeError('boom');
      }),
    );
    await expect(createFsaSource().pickRoot()).resolves.toBeNull();
  });

  it('returns null when the picker is missing', async () => {
    vi.stubGlobal('showDirectoryPicker', undefined);
    await expect(createFsaSource().pickRoot()).resolves.toBeNull();
  });
});

describe('FR-3 fsaSource.listChildren', () => {
  it('yields each handle as an entry, in arrival order', async () => {
    const children = [fakeHandle('b.txt', 'file'), fakeHandle('src', 'directory')];
    const dirHandle = fakeHandle('project', 'directory', {
      async *values() {
        yield* children;
      },
    });
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirHandle));
    const source = createFsaSource();
    const root = await source.pickRoot();
    const got = [];
    for await (const entry of source.listChildren(root!.ref)) got.push(entry);
    expect(got.map(({ name, kind }) => ({ name, kind }))).toEqual([
      { name: 'b.txt', kind: 'file' },
      { name: 'src', kind: 'directory' },
    ]);
  });

  it('fails through a rejected next(), not a synchronous throw', async () => {
    const dirHandle = fakeHandle('locked', 'directory', {
      values() {
        throw new DOMException('denied', 'NotAllowedError');
      },
    });
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirHandle));
    const source = createFsaSource();
    const root = await source.pickRoot();
    const iterator = source.listChildren(root!.ref)[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow('denied');
  });
});

describe('FR-7 fsaSource.readFileMeta', () => {
  async function pickWithChild(child: object) {
    const dirHandle = fakeHandle('project', 'directory', {
      async *values() {
        yield child;
      },
    });
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirHandle));
    const source = createFsaSource();
    const root = await source.pickRoot();
    const entries = [];
    for await (const entry of source.listChildren(root!.ref)) entries.push(entry);
    return { source, ref: entries[0].ref };
  }

  it('maps getFile() to size and lastModified', async () => {
    const getFile = vi.fn().mockResolvedValue({ size: 1500, lastModified: 1761146400000 });
    const { source, ref } = await pickWithChild(fakeHandle('a.pdf', 'file', { getFile }));
    await expect(source.readFileMeta(ref)).resolves.toEqual({ size: 1500, lastModified: 1761146400000 });
  });

  it('fails through a rejected promise when getFile() rejects', async () => {
    const getFile = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const { source, ref } = await pickWithChild(fakeHandle('a.pdf', 'file', { getFile }));
    await expect(source.readFileMeta(ref)).rejects.toThrow('denied');
  });
});

describe('fsaSource.readFile', () => {
  async function pickWithChild(child: object) {
    const dirHandle = fakeHandle('project', 'directory', {
      async *values() {
        yield child;
      },
    });
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirHandle));
    const source = createFsaSource();
    const root = await source.pickRoot();
    const entries = [];
    for await (const entry of source.listChildren(root!.ref)) entries.push(entry);
    return { source, ref: entries[0].ref };
  }

  it('resolves to the blob from getFile()', async () => {
    const content = new Blob(['x']);
    const getFile = vi.fn().mockResolvedValue(content);
    const { source, ref } = await pickWithChild(fakeHandle('a.png', 'file', { getFile }));
    await expect(source.readFile(ref)).resolves.toBe(content);
  });

  it('fails through a rejected promise when getFile() rejects', async () => {
    const getFile = vi.fn().mockRejectedValue(new DOMException('gone', 'NotFoundError'));
    const { source, ref } = await pickWithChild(fakeHandle('a.png', 'file', { getFile }));
    await expect(source.readFile(ref)).rejects.toThrow('gone');
  });
});

// FakeDirectorySource (AD-11): a DirectorySource built from an object tree.

import type { DirectorySource, Entry, FileMeta, SourceRef } from '../lib/source.ts';

export interface Deferred {
  promise: Promise<void>;
  resolve(): void;
  reject(reason?: unknown): void;
}

/** A promise you settle by hand, to control the order in which reads finish. */
export function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // A gate may be rejected before anyone awaits it.
  promise.catch(() => {});
  return { promise, resolve, reject };
}

export interface FakeFile {
  kind: 'file';
  size: number;
  lastModified: number | null;
  /** readFileMeta rejects. */
  failMeta: boolean;
  /** readFileMeta waits for this first. */
  gate?: Promise<void>;
  /** What readFile resolves to. */
  content: Blob;
  /** readFile rejects. */
  failRead: boolean;
  /** readFile waits for this first. */
  readGate?: Promise<void>;
}

export interface FakeDir {
  kind: 'directory';
  /** Insertion order is arrival order. Avoid integer-like names: JS puts them first. */
  children: Record<string, FakeNode>;
  /** listChildren rejects after yielding this many entries (0 = before the first). */
  failAfter?: number;
  /** listChildren waits for this before the first entry. A rejected gate fails before the first entry. */
  gate?: Promise<void>;
}

export type FakeNode = FakeFile | FakeDir;

export function dir(
  children: Record<string, FakeNode> = {},
  options: { failAfter?: number; gate?: Promise<void> } = {},
): FakeDir {
  return { kind: 'directory', children, ...options };
}

export function file(
  options: {
    size?: number;
    lastModified?: number | null;
    failMeta?: boolean;
    gate?: Promise<void>;
    content?: Blob;
    failRead?: boolean;
    readGate?: Promise<void>;
  } = {},
): FakeFile {
  return {
    kind: 'file',
    size: options.size ?? 0,
    lastModified: options.lastModified === undefined ? 0 : options.lastModified,
    failMeta: options.failMeta ?? false,
    gate: options.gate,
    content: options.content ?? new Blob([]),
    failRead: options.failRead ?? false,
    readGate: options.readGate,
  };
}

export interface FakeSource extends DirectorySource {
  /** The next pickRoot resolves to this folder. */
  queuePick(name: string, root: FakeDir): void;
  /** The next pickRoot resolves to null (cancel). */
  queueCancel(): void;
  readonly calls: {
    pickRoot: number;
    listChildren: FakeDir[];
    readFileMeta: FakeFile[];
    readFile: FakeFile[];
  };
}

function toRef(node: FakeNode): SourceRef {
  return node as unknown as SourceRef;
}

function fromRef<T extends FakeNode>(ref: SourceRef): T {
  return ref as unknown as T;
}

export function createFakeSource(options: { supported?: boolean } = {}): FakeSource {
  const supported = options.supported ?? true;
  const picks: Array<Entry | null> = [];
  const calls: FakeSource['calls'] = { pickRoot: 0, listChildren: [], readFileMeta: [], readFile: [] };

  return {
    calls,
    queuePick(name, root) {
      picks.push({ name, kind: 'directory', ref: toRef(root) });
    },
    queueCancel() {
      picks.push(null);
    },
    isSupported: () => supported,
    async pickRoot() {
      calls.pickRoot += 1;
      return picks.shift() ?? null;
    },
    async *listChildren(ref: SourceRef): AsyncGenerator<Entry> {
      const node = fromRef<FakeDir>(ref);
      calls.listChildren.push(node);
      if (node.gate) await node.gate;
      let count = 0;
      for (const [name, child] of Object.entries(node.children)) {
        if (node.failAfter === count) throw new Error('fake: listing failed');
        yield { name, kind: child.kind, ref: toRef(child) };
        count += 1;
      }
      if (node.failAfter === count) throw new Error('fake: listing failed');
    },
    async readFileMeta(ref: SourceRef): Promise<FileMeta> {
      const node = fromRef<FakeFile>(ref);
      calls.readFileMeta.push(node);
      if (node.gate) await node.gate;
      if (node.failMeta) throw new Error('fake: meta failed');
      return { size: node.size, lastModified: node.lastModified };
    },
    async readFile(ref: SourceRef): Promise<Blob> {
      const node = fromRef<FakeFile>(ref);
      calls.readFile.push(node);
      if (node.readGate) await node.readGate;
      if (node.failRead) throw new Error('fake: read failed');
      return node.content;
    },
  };
}

/** Lets every pending microtask (including async generators) run. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

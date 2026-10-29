// The port (AD-2): the only way the app reaches the disk.

declare const sourceRefBrand: unique symbol;

/** Opaque handle. Only the adapter that created it may open it. */
export type SourceRef = { readonly [sourceRefBrand]: true };

export type EntryKind = 'file' | 'directory';

export interface Entry {
  name: string;
  kind: EntryKind;
  ref: SourceRef;
}

export interface FileMeta {
  size: number;
  lastModified: number | null;
}

export interface DirectorySource {
  /** FR-2 */
  isSupported(): boolean;
  /** FR-1: opens with mode 'read'. Never throws; every failure resolves to null. */
  pickRoot(): Promise<Entry | null>;
  /** FR-3, FR-5: entries in arrival order. Failures arrive only as a rejected next(). */
  listChildren(dir: SourceRef): AsyncIterable<Entry>;
  /** FR-7: failures arrive only as a rejected promise. */
  readFileMeta(file: SourceRef): Promise<FileMeta>;
  /** The file's content, for a preview. Failures arrive only as a rejected promise. */
  readFile(file: SourceRef): Promise<Blob>;
}

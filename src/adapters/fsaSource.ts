// The real DirectorySource over the File System Access API (AD-2).
// Handles stay in memory only.

import type { DirectorySource, Entry, FileMeta, SourceRef } from '../lib/source.ts';

function toRef(handle: FileSystemHandle): SourceRef {
  return handle as unknown as SourceRef;
}

function fromRef<T extends FileSystemHandle>(ref: SourceRef): T {
  return ref as unknown as T;
}

export function createFsaSource(): DirectorySource {
  return {
    isSupported() {
      return typeof window.showDirectoryPicker === 'function';
    },

    async pickRoot(): Promise<Entry | null> {
      try {
        if (typeof window.showDirectoryPicker !== 'function') return null;
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        return { name: handle.name, kind: 'directory', ref: toRef(handle) };
      } catch {
        // Cancel, blocked folder, denied permission: all behave like cancel (FR-1).
        return null;
      }
    },

    async *listChildren(dir: SourceRef): AsyncGenerator<Entry> {
      for await (const handle of fromRef<FileSystemDirectoryHandle>(dir).values()) {
        yield { name: handle.name, kind: handle.kind, ref: toRef(handle) };
      }
    },

    async readFileMeta(file: SourceRef): Promise<FileMeta> {
      const blob = await fromRef<FileSystemFileHandle>(file).getFile();
      return { size: blob.size, lastModified: blob.lastModified };
    },

    async readFile(file: SourceRef): Promise<Blob> {
      // The File itself; its browser-reported MIME type is never read.
      return fromRef<FileSystemFileHandle>(file).getFile();
    },
  };
}

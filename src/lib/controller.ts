// The controller (AD-3): the only place that decides on I/O.

import type { DirectorySource, Entry, SourceRef } from './source.ts';
import { reduce } from './reducer.ts';
import { ROOT_ID, createInitialState } from './state.ts';
import type { Action, AppState, NodeId } from './state.ts';

export interface Controller {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  openFolder(): Promise<void>;
  /** FR-3: flips a folder open or closed; reads it on the first open in this generation. Never rejects. */
  toggle(id: NodeId): Promise<void>;
  /**
   * FR-3, FR-7, FR-8: selects an item; reads a file's details unless it is already selected or unreadable,
   * and an image's content alongside them. Never rejects.
   */
  select(id: NodeId): Promise<void>;
}

export function createController(source: DirectorySource): Controller {
  let state = createInitialState(source.isSupported());
  const listeners = new Set<() => void>();
  let requestSeq = 0;

  function dispatch(action: Action): void {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  async function loadFolder(gen: number, id: NodeId, ref: SourceRef): Promise<void> {
    const entries: Entry[] = [];
    try {
      // Both the listChildren call and the iteration are inside the try (AD-6).
      for await (const entry of source.listChildren(ref)) entries.push(entry);
    } catch {
      dispatch(
        entries.length === 0
          ? { type: 'loadFailed', gen, id }
          : { type: 'loadTruncated', gen, id, entries },
      );
      return;
    }
    dispatch({ type: 'loadSucceeded', gen, id, entries });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async openFolder() {
      if (!state.supported) return;
      const entry = await source.pickRoot();
      if (entry === null) return;
      const gen = state.generation + 1;
      dispatch({ type: 'rootPicked', gen, entry });
      await loadFolder(gen, ROOT_ID, entry.ref);
    },
    async toggle(id) {
      dispatch({ type: 'toggled', id });
      const node = state.nodes.get(id);
      if (!node || !state.expanded.has(id) || node.load !== 'unloaded') return;
      const gen = state.generation;
      dispatch({ type: 'loadStarted', gen, id });
      await loadFolder(gen, id, node.ref);
    },
    async select(id) {
      const node = state.nodes.get(id);
      if (!node) return;
      if (node.kind === 'directory') {
        dispatch({ type: 'folderSelected', id });
        return;
      }
      const gen = state.generation;
      const requestId = ++requestSeq;
      const before = state;
      dispatch({ type: 'fileSelected', gen, id, requestId });
      // The reducer decided: already selected (same reference) or unreadable (cleared).
      if (state === before || state.selectedId !== id) return;
      // The reducer also decided whether this file has a preview to read.
      const wantsContent = state.preview.kind === 'loading' && state.preview.requestId === requestId;

      async function readMeta(ref: SourceRef): Promise<void> {
        try {
          const meta = await source.readFileMeta(ref);
          dispatch({ type: 'metaLoaded', gen, requestId, meta });
        } catch {
          dispatch({ type: 'metaFailed', gen, id, requestId });
        }
      }

      async function readContent(ref: SourceRef): Promise<void> {
        try {
          const blob = await source.readFile(ref);
          dispatch({ type: 'previewLoaded', gen, requestId, blob });
        } catch {
          dispatch({ type: 'previewFailed', gen, requestId });
        }
      }

      await Promise.all([readMeta(node.ref), wantsContent ? readContent(node.ref) : undefined]);
    },
  };
}

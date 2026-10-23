// The controller (AD-3): the only place that decides on I/O.

import type { DirectorySource, Entry, SourceRef } from './source.ts';
import { reduce } from './reducer.ts';
import { ROOT_ID, createInitialState } from './state.ts';
import type { Action, AppState, NodeId } from './state.ts';

export interface Controller {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
  openFolder(): Promise<void>;
}

export function createController(source: DirectorySource): Controller {
  let state = createInitialState(source.isSupported());
  const listeners = new Set<() => void>();

  function dispatch(action: Action): void {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  async function loadFolder(gen: number, id: NodeId, ref: SourceRef): Promise<void> {
    const entries: Entry[] = [];
    try {
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
  };
}

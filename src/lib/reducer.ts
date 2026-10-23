// The pure reducer (AD-3). A dropped action returns the same reference.
// All staleness checks live here (AD-5).

import type { Entry } from './source.ts';
import { compareEntries } from './sort.ts';
import { NO_DETAILS, ROOT_ID, childId } from './state.ts';
import type { Action, AppState, NodeId, TreeNode } from './state.ts';

function newNode(id: NodeId, entry: Entry, load: TreeNode['load']): TreeNode {
  return {
    id,
    name: entry.name,
    kind: entry.kind,
    ref: entry.ref,
    load,
    children: [],
    truncated: false,
    unreadable: false,
  };
}

function withContents(
  state: AppState,
  id: NodeId,
  entries: readonly Entry[],
  truncated: boolean,
): AppState {
  const parent = state.nodes.get(id);
  if (!parent) return state;
  const sorted = [...entries].sort(compareEntries);
  const nodes = new Map(state.nodes);
  const children = sorted.map((entry) => {
    const cid = childId(id, entry.name);
    nodes.set(cid, newNode(cid, entry, 'unloaded'));
    return cid;
  });
  nodes.set(id, { ...parent, load: 'loaded', children, truncated });
  return { ...state, nodes };
}

function isStaleLoad(state: AppState, gen: number, id: NodeId): boolean {
  if (gen !== state.generation) return true;
  const node = state.nodes.get(id);
  return !node || node.kind !== 'directory' || node.load !== 'loading';
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'rootPicked': {
      if (action.gen !== state.generation + 1) return state;
      return {
        supported: state.supported,
        generation: action.gen,
        nodes: new Map([[ROOT_ID, newNode(ROOT_ID, action.entry, 'loading')]]),
        expanded: new Set([ROOT_ID]),
        selectedId: null,
        details: NO_DETAILS,
      };
    }
    case 'toggled': {
      // Only flips `expanded`. Files, failed folders and unknown ids are dropped.
      const node = state.nodes.get(action.id);
      if (!node || node.kind !== 'directory' || node.load === 'failed') return state;
      const expanded = new Set(state.expanded);
      if (expanded.has(action.id)) expanded.delete(action.id);
      else expanded.add(action.id);
      return { ...state, expanded };
    }
    case 'loadStarted': {
      if (action.gen !== state.generation) return state;
      const node = state.nodes.get(action.id);
      if (!node || node.kind !== 'directory' || node.load !== 'unloaded') return state;
      const nodes = new Map(state.nodes);
      nodes.set(action.id, { ...node, load: 'loading' });
      return { ...state, nodes };
    }
    case 'loadSucceeded':
    case 'loadTruncated': {
      if (isStaleLoad(state, action.gen, action.id)) return state;
      return withContents(state, action.id, action.entries, action.type === 'loadTruncated');
    }
    case 'loadFailed': {
      if (isStaleLoad(state, action.gen, action.id)) return state;
      const node = state.nodes.get(action.id);
      if (!node) return state;
      const nodes = new Map(state.nodes);
      nodes.set(action.id, { ...node, load: 'failed' });
      return { ...state, nodes };
    }
  }
}

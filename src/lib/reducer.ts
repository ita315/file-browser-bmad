// The pure reducer (AD-3). A dropped action returns the same reference.
// All staleness checks live here (AD-5).

import { previewOf } from './fileKinds.ts';
import type { Entry } from './source.ts';
import { compareEntries } from './sort.ts';
import { NO_DETAILS, NO_PREVIEW, ROOT_ID, childId } from './state.ts';
import type { Action, AppState, NodeId, Preview, SettledPreview, TreeNode } from './state.ts';

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

/** Clears the selection; the same reference when nothing is selected. */
function clearSelection(state: AppState): AppState {
  if (state.selectedId === null && state.details.kind === 'none' && state.preview.kind === 'none') return state;
  return { ...state, selectedId: null, details: NO_DETAILS, preview: NO_PREVIEW };
}

/** What stays on screen while a new preview loads: the last settled one, kept across A→B→C. */
function settledOf(preview: Preview): SettledPreview | null {
  switch (preview.kind) {
    case 'none':
      return null;
    case 'loading':
      return preview.shown;
    case 'ready':
    case 'failed':
      return preview;
  }
}

/** The loading preview this content belongs to, or null when the content is stale. */
function currentPreview(state: AppState, gen: number, requestId: number): Extract<Preview, { kind: 'loading' }> | null {
  if (gen !== state.generation) return null;
  const { preview } = state;
  return preview.kind === 'loading' && preview.requestId === requestId ? preview : null;
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
        preview: NO_PREVIEW,
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
    case 'fileSelected': {
      if (action.gen !== state.generation) return state;
      const node = state.nodes.get(action.id);
      if (!node || node.kind !== 'file') return state;
      // A known unreadable file is never read again (FR-5).
      if (node.unreadable) return clearSelection(state);
      if (state.selectedId === action.id) return state;
      return {
        ...state,
        selectedId: action.id,
        details: { kind: 'loading', id: action.id, requestId: action.requestId },
        preview: previewOf(node.name)
          ? { kind: 'loading', id: action.id, requestId: action.requestId, shown: settledOf(state.preview) }
          : NO_PREVIEW,
      };
    }
    case 'folderSelected': {
      const node = state.nodes.get(action.id);
      if (!node || node.kind !== 'directory') return state;
      if (node.load === 'failed') return clearSelection(state);
      if (state.selectedId === action.id && state.details.kind === 'none' && state.preview.kind === 'none') {
        return state;
      }
      return { ...state, selectedId: action.id, details: NO_DETAILS, preview: NO_PREVIEW };
    }
    case 'metaLoaded': {
      if (action.gen !== state.generation) return state;
      const { details } = state;
      if (details.kind !== 'loading' || details.requestId !== action.requestId) return state;
      return {
        ...state,
        details: {
          kind: 'ready',
          id: details.id,
          requestId: details.requestId,
          size: action.meta.size,
          lastModified: action.meta.lastModified,
        },
      };
    }
    case 'metaFailed': {
      // Dropped only when the root changed: the file is unreadable either way.
      if (action.gen !== state.generation) return state;
      const node = state.nodes.get(action.id);
      if (!node || node.kind !== 'file') return state;
      const { details } = state;
      const current =
        details.kind !== 'none' && details.id === action.id && details.requestId === action.requestId;
      if (node.unreadable && !current) return state;
      const nodes = node.unreadable ? state.nodes : new Map(state.nodes).set(action.id, { ...node, unreadable: true });
      const next = { ...state, nodes };
      return current ? { ...next, selectedId: null, details: NO_DETAILS, preview: NO_PREVIEW } : next;
    }
    case 'previewLoaded': {
      const preview = currentPreview(state, action.gen, action.requestId);
      if (!preview) return state;
      return { ...state, preview: { kind: 'ready', id: preview.id, requestId: preview.requestId, blob: action.blob } };
    }
    case 'previewFailed': {
      const preview = currentPreview(state, action.gen, action.requestId);
      if (!preview) return state;
      return { ...state, preview: { kind: 'failed', id: preview.id, requestId: preview.requestId } };
    }
  }
}

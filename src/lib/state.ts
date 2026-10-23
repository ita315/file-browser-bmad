// AppState, TreeNode, ids and actions (AD-3, AD-4, AD-5, AD-6).

import type { Entry, EntryKind, SourceRef } from './source.ts';

/** Path relative to the root. The root itself is ''. */
export type NodeId = string;

export const ROOT_ID: NodeId = '';

export function childId(parent: NodeId, name: string): NodeId {
  return parent === ROOT_ID ? name : parent + '/' + name;
}

/** React key of the status row under a folder. Cannot collide with an item id. */
export function statusKey(parent: NodeId): string {
  return parent + '\u0000status';
}

export type LoadState = 'unloaded' | 'loading' | 'loaded' | 'failed';

export interface TreeNode {
  readonly id: NodeId;
  readonly name: string;
  readonly kind: EntryKind;
  readonly ref: SourceRef;
  /** Folders only. */
  readonly load: LoadState;
  /** Folders only. Sorted by compareEntries. */
  readonly children: readonly NodeId[];
  /** Folders only: the listing failed after one or more entries. */
  readonly truncated: boolean;
  /** Files only. */
  readonly unreadable: boolean;
}

/** Describes a file selection only. Story 1.1 has no selection yet. */
export type Details = { readonly kind: 'none' };

export interface AppState {
  readonly supported: boolean;
  readonly generation: number;
  readonly nodes: ReadonlyMap<NodeId, TreeNode>;
  readonly expanded: ReadonlySet<NodeId>;
  readonly selectedId: NodeId | null;
  readonly details: Details;
}

export type Action =
  | { type: 'rootPicked'; gen: number; entry: Entry }
  | { type: 'loadSucceeded'; gen: number; id: NodeId; entries: readonly Entry[] }
  | { type: 'loadTruncated'; gen: number; id: NodeId; entries: readonly Entry[] }
  | { type: 'loadFailed'; gen: number; id: NodeId };

export const NO_DETAILS: Details = { kind: 'none' };

export function createInitialState(supported: boolean): AppState {
  return {
    supported,
    generation: 0,
    nodes: new Map(),
    expanded: new Set(),
    selectedId: null,
    details: NO_DETAILS,
  };
}

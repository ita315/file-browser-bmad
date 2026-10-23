// AD-8: the UI renders only what these return.

import { formatDate, formatSize, formatType } from './format.ts';
import { ROOT_ID, statusKey } from './state.ts';
import type { AppState, NodeId, TreeNode } from './state.ts';
import { TEXT } from './text.ts';

export type TopBarView =
  | { mode: 'unsupported'; text: string }
  | { mode: 'picker'; rootName: string | null };

export type Chevron = 'none' | 'collapsed' | 'expanded';

export type ItemRow = {
  type: 'item';
  id: NodeId;
  name: string;
  icon: 'folder' | 'file';
  chevron: Chevron;
  depth: number;
  selected: boolean;
  unreadable: boolean;
};

export type StatusRow = { type: 'status'; key: string; depth: number; text: string };

export type Row = ItemRow | StatusRow;

export type DetailsView =
  | { type: 'empty' }
  | { type: 'loading'; name: string }
  | { type: 'file'; name: string; typeLabel: string; size: string; modified: string }
  | { type: 'folder'; name: string };

export function selectTopBar(state: AppState): TopBarView {
  if (!state.supported) return { mode: 'unsupported', text: TEXT.unsupportedBrowser };
  return { mode: 'picker', rootName: state.nodes.get(ROOT_ID)?.name ?? null };
}

function chevronOf(state: AppState, node: TreeNode): Chevron {
  if (node.kind === 'file' || node.load === 'failed') return 'none';
  return state.expanded.has(node.id) ? 'expanded' : 'collapsed';
}

function pushNode(state: AppState, node: TreeNode, depth: number, rows: Row[]): void {
  const chevron = chevronOf(state, node);
  rows.push({
    type: 'item',
    id: node.id,
    name: node.name,
    icon: node.kind === 'directory' ? 'folder' : 'file',
    chevron,
    depth,
    selected: state.selectedId === node.id,
    unreadable: node.kind === 'file' ? node.unreadable : node.load === 'failed',
  });
  if (chevron !== 'expanded') return;

  const status = (text: string): StatusRow => ({
    type: 'status',
    key: statusKey(node.id),
    depth: depth + 1,
    text,
  });
  if (node.load === 'loading') {
    rows.push(status(TEXT.loading));
    return;
  }
  for (const id of node.children) {
    const child = state.nodes.get(id);
    if (child) pushNode(state, child, depth + 1, rows);
  }
  if (node.truncated) rows.push(status(TEXT.unableToRead));
  else if (node.load === 'loaded' && node.children.length === 0) rows.push(status(TEXT.emptyFolder));
}

export function selectVisibleRows(state: AppState): Row[] {
  const root = state.nodes.get(ROOT_ID);
  if (!root) return [];
  const rows: Row[] = [];
  pushNode(state, root, 0, rows);
  return rows;
}

export function selectDetails(state: AppState): DetailsView {
  const { details } = state;
  if (details.kind !== 'none') {
    const node = state.nodes.get(details.id);
    if (!node) return { type: 'empty' };
    if (details.kind === 'loading') return { type: 'loading', name: node.name };
    return {
      type: 'file',
      name: node.name,
      typeLabel: formatType(node.name),
      size: formatSize(details.size),
      // Local time zone in the app; tests compare against formatDate itself.
      modified: formatDate(details.lastModified),
    };
  }
  const selected = state.selectedId === null ? undefined : state.nodes.get(state.selectedId);
  if (selected?.kind === 'directory') return { type: 'folder', name: selected.name };
  return { type: 'empty' };
}

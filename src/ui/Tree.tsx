import type { Row } from '../lib/selectors.ts';
import type { NodeId } from '../lib/state.ts';
import { TreeRow } from './TreeRow.tsx';

export function Tree({
  rows,
  summary,
  onToggle,
  onSelect,
}: {
  rows: readonly Row[];
  summary: string | null;
  onToggle: (id: NodeId) => void;
  onSelect: (id: NodeId) => void;
}) {
  return (
    // The pane holds the scrolling tree and, below it, the summary footer that never scrolls.
    <div className="tree-pane">
      <nav className="tree">
        {rows.map((row) => (
          <TreeRow key={row.type === 'item' ? row.id : row.key} row={row} onToggle={onToggle} onSelect={onSelect} />
        ))}
      </nav>
      {summary !== null && <p className="tree-summary">{summary}</p>}
    </div>
  );
}

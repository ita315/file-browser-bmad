import type { Row } from '../lib/selectors.ts';
import type { NodeId } from '../lib/state.ts';
import { TreeRow } from './TreeRow.tsx';

export function Tree({
  rows,
  onToggle,
  onSelect,
}: {
  rows: readonly Row[];
  onToggle: (id: NodeId) => void;
  onSelect: (id: NodeId) => void;
}) {
  return (
    <nav className="tree">
      {rows.map((row) => (
        <TreeRow key={row.type === 'item' ? row.id : row.key} row={row} onToggle={onToggle} onSelect={onSelect} />
      ))}
    </nav>
  );
}

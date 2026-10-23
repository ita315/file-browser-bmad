import type { Row } from '../lib/selectors.ts';
import { TreeRow } from './TreeRow.tsx';

export function Tree({ rows }: { rows: readonly Row[] }) {
  return (
    <nav className="tree">
      {rows.map((row) => (
        <TreeRow key={row.type === 'item' ? row.id : row.key} row={row} />
      ))}
    </nav>
  );
}

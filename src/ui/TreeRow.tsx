import type { Row } from '../lib/selectors.ts';
import { TEXT } from '../lib/text.ts';
import { ChevronIcon, FileIcon, FolderIcon } from './icons.tsx';

export function TreeRow({ row }: { row: Row }) {
  if (row.type === 'status') {
    return (
      <div className="status-row" data-depth={row.depth}>
        <span className="tree-chevron-spacer" />
        <span className="status-row-text">{row.text}</span>
      </div>
    );
  }
  return (
    <div className="tree-row" data-depth={row.depth}>
      {row.chevron === 'none' ? (
        <span className="tree-chevron-spacer" />
      ) : (
        <button type="button" className="tree-chevron">
          <ChevronIcon open={row.chevron === 'expanded'} />
        </button>
      )}
      <button type="button" className="tree-name-button">
        {row.icon === 'folder' ? <FolderIcon /> : <FileIcon />}
        <span className="tree-name bidi-isolate" dir="ltr">
          {row.name}
        </span>
        {row.unreadable && <span className="unreadable-message">{TEXT.unableToRead}</span>}
      </button>
    </div>
  );
}

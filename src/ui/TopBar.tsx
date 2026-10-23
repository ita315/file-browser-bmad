import type { TopBarView } from '../lib/selectors.ts';
import { TEXT } from '../lib/text.ts';

export function TopBar({ view, onOpenFolder }: { view: TopBarView; onOpenFolder: () => void }) {
  if (view.mode === 'unsupported') {
    return (
      <header className="top-bar">
        <p className="unsupported-message">{view.text}</p>
      </header>
    );
  }
  return (
    <header className="top-bar">
      <button type="button" className="button-primary" onClick={onOpenFolder}>
        {TEXT.openFolder}
      </button>
      {view.rootName !== null && (
        <span className="root-name bidi-isolate" dir="ltr">
          {view.rootName}
        </span>
      )}
    </header>
  );
}

import { useMemo } from 'react';
import type { Controller } from '../lib/controller.ts';
import { selectDetails, selectPreview, selectTopBar, selectVisibleRows } from '../lib/selectors.ts';
import { DetailsPanel } from './DetailsPanel.tsx';
import { PreviewPane } from './PreviewPane.tsx';
import { TopBar } from './TopBar.tsx';
import { Tree } from './Tree.tsx';
import { useAppState } from './useAppState.ts';

export function App({ controller }: { controller: Controller }) {
  const state = useAppState(controller);
  const topBar = useMemo(() => selectTopBar(state), [state]);
  const rows = useMemo(() => selectVisibleRows(state), [state]);
  const details = useMemo(() => selectDetails(state), [state]);
  const preview = useMemo(() => selectPreview(state), [state]);

  return (
    <div className="app">
      <TopBar view={topBar} onOpenFolder={() => void controller.openFolder()} />
      <main className="app-body">
        <Tree
          rows={rows}
          onToggle={(id) => void controller.toggle(id)}
          onSelect={(id) => void controller.select(id)}
        />
        <div className={preview.type === 'none' ? 'app-side' : 'app-side app-side--with-preview'}>
          <DetailsPanel view={details} />
          <PreviewPane view={preview} />
        </div>
      </main>
    </div>
  );
}

import { useMemo } from 'react';
import type { Controller } from '../lib/controller.ts';
import { selectDetails, selectTopBar, selectVisibleRows } from '../lib/selectors.ts';
import { DetailsPanel } from './DetailsPanel.tsx';
import { TopBar } from './TopBar.tsx';
import { Tree } from './Tree.tsx';
import { useAppState } from './useAppState.ts';

export function App({ controller }: { controller: Controller }) {
  const state = useAppState(controller);
  const topBar = useMemo(() => selectTopBar(state), [state]);
  const rows = useMemo(() => selectVisibleRows(state), [state]);
  const details = useMemo(() => selectDetails(state), [state]);

  return (
    <div className="app">
      <TopBar view={topBar} onOpenFolder={() => void controller.openFolder()} />
      <main className="app-body">
        <Tree rows={rows} />
        <DetailsPanel view={details} />
      </main>
    </div>
  );
}

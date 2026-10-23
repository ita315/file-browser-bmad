import { useSyncExternalStore } from 'react';
import type { Controller } from '../lib/controller.ts';
import type { AppState } from '../lib/state.ts';

export function useAppState(controller: Controller): AppState {
  return useSyncExternalStore(controller.subscribe, controller.getState);
}

import { createContext, useContext, type Dispatch } from 'react';
import type { Action } from './store';
import type { AppState } from './types';

export interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

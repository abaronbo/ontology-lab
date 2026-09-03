import { useMemo, useReducer, type ReactNode } from 'react';
import { initialState, reducer } from './store';
import { StoreContext } from './StoreContext';
import type { AppState } from './types';

export function StoreProvider({ children, initial = initialState }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

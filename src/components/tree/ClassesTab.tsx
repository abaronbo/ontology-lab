import { useMemo } from 'react';
import { buildClassTree } from '../../model/derive';
import { useStore } from '../../model/StoreContext';

export function ClassesTab() {
  const { state, dispatch } = useStore();
  const rows = useMemo(() => buildClassTree(state.nodes, state.edges), [state.nodes, state.edges]);
  const sel = state.selection;
  return (
    <div className="tree__body">
      <div className="tree__hint">Check a class to filter the graph to it and its relations.</div>
      {rows.map(({ node, depth }, i) => {
        const selected = sel?.type === 'node' && sel.id === node.id;
        return (
          <div className="class-row" key={`${node.id}-${i}`} style={{ paddingLeft: depth * 18 }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={state.focusIds.includes(node.id)}
              onChange={() => dispatch({ type: 'toggleFocus', id: node.id })}
              aria-label={`Filter graph to ${node.label}`}
            />
            <div
              className={`class-row__hit ${selected ? 'class-row__hit--selected' : ''}`}
              onClick={() => dispatch({ type: 'select', selection: { type: 'node', id: node.id } })}
            >
              <div className="class-row__label">{node.label}</div>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && <div className="tree__empty">No classes yet. Use "+ Class" above.</div>}
    </div>
  );
}

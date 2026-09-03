import { indexNodes, relationRowsForNode } from '../../model/derive';
import { useStore } from '../../model/StoreContext';
import type { OntoEdge, OntoNode } from '../../model/types';
import { CardinalityControl } from './CardinalityControl';

interface Props {
  node?: OntoNode;
  edge?: OntoEdge;
}

export function RelationsTab({ node, edge }: Props) {
  const { state, dispatch } = useStore();
  const byId = indexNodes(state.nodes);

  if (node) {
    const rows = relationRowsForNode(node, state.edges, byId);
    return (
      <div>
        {rows.map((r, i) => (
          <div key={`${r.edgeId}-${i}`} className="relation-row" onClick={() => dispatch({ type: 'select', selection: { type: 'edge', id: r.edgeId } })}>
            <div className="relation-row__text">{r.text}</div>
            <div className="relation-row__detail">{r.detail}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="relations__empty">No relations yet. Drag a handle from this node to another one.</div>}
      </div>
    );
  }
  if (!edge) return null;
  const source = byId[edge.source];
  const target = byId[edge.target];
  if (edge.kind === 'subClassOf') {
    return (
      <div className="statement subclass-statement">
        <span className="mono">{source?.label ?? ''}</span> rdfs:subClassOf <span className="mono">{target?.label ?? ''}</span>
      </div>
    );
  }
  return <CardinalityControl edge={edge} source={source} target={target} />;
}

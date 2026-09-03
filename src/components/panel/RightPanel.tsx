import { useStore } from '../../model/StoreContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AnnotationsTab } from './AnnotationsTab';
import { RelationsTab } from './RelationsTab';

const BADGE: Record<string, string> = {
  class: 'Class',
  literal: 'Literal',
  objectProperty: 'Object property',
  datatypeProperty: 'Datatype property',
  subClassOf: 'subClassOf',
};

export function RightPanel() {
  const { state, dispatch } = useStore();
  const sel = state.selection;
  const node = sel?.type === 'node' ? state.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel?.type === 'edge' ? state.edges.find((e) => e.id === sel.id) : undefined;
  const kind = node ? node.type : edge ? edge.kind : null;

  if (!kind) {
    return (
      <aside className="panel">
        <div className="panel__empty">Select a class, literal, or property on the canvas or in the tree to edit its annotations.</div>
      </aside>
    );
  }
  const isAnn = state.panelTab === 'annotations';
  return (
    <aside className="panel">
      <div className="panel__body">
        <div className="panel__header">
          <Badge tone="info">{BADGE[kind]}</Badge>
          <Button variant="outlined" onClick={() => dispatch({ type: 'deleteSelected' })}>Delete</Button>
        </div>
        <div className="panel__tabs" role="tablist">
          <button role="tab" aria-selected={isAnn} className={`panel__tab ${isAnn ? 'panel__tab--active' : ''}`} onClick={() => dispatch({ type: 'setPanelTab', tab: 'annotations' })}>
            Annotations
          </button>
          <button role="tab" aria-selected={!isAnn} className={`panel__tab ${!isAnn ? 'panel__tab--active' : ''}`} onClick={() => dispatch({ type: 'setPanelTab', tab: 'relations' })}>
            Relations
          </button>
        </div>
        {isAnn ? <AnnotationsTab node={node} edge={edge} /> : <RelationsTab node={node} edge={edge} />}
      </div>
    </aside>
  );
}

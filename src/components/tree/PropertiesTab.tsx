import { propertyEdges } from '../../model/derive';
import { useStore } from '../../model/StoreContext';

export function PropertiesTab() {
  const { state, dispatch } = useStore();
  const props = propertyEdges(state.edges);
  const sel = state.selection;
  return (
    <div className="tree__body">
      {props.map((e) => {
        const isDatatype = e.kind === 'datatypeProperty';
        const selected = sel?.type === 'edge' && sel.id === e.id;
        return (
          <div
            key={e.id}
            className={`prop-row ${selected ? 'prop-row--selected' : ''}`}
            onClick={() => dispatch({ type: 'selectEdgeFromTree', id: e.id })}
          >
            <div className={`prop-row__dot ${isDatatype ? 'prop-row__dot--datatype' : 'prop-row__dot--object'}`} />
            <div className="prop-row__text">
              <div className="prop-row__label">{e.label}</div>
              <div className="prop-row__kind">{isDatatype ? 'Datatype property' : 'Object property'}</div>
            </div>
          </div>
        );
      })}
      {props.length === 0 && <div className="tree__empty">Draw a connection between two nodes to create a property.</div>}
    </div>
  );
}

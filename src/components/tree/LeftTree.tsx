import { propertyEdges } from '../../model/derive';
import { useStore } from '../../model/StoreContext';
import { ClassesTab } from './ClassesTab';
import { PropertiesTab } from './PropertiesTab';

export function LeftTree() {
  const { state, dispatch } = useStore();
  const classCount = state.nodes.filter((n) => n.type === 'class').length;
  const propCount = propertyEdges(state.edges).length;
  const isClasses = state.activeTab === 'classes';
  return (
    <aside className="tree">
      <div className="tree__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={isClasses}
          className={`tree__tab ${isClasses ? 'tree__tab--active' : ''}`}
          onClick={() => dispatch({ type: 'setTreeTab', tab: 'classes' })}
        >
          Classes ({classCount})
        </button>
        <button
          role="tab"
          aria-selected={!isClasses}
          className={`tree__tab ${!isClasses ? 'tree__tab--active' : ''}`}
          onClick={() => dispatch({ type: 'setTreeTab', tab: 'properties' })}
        >
          Properties ({propCount})
        </button>
      </div>
      {isClasses ? <ClassesTab /> : <PropertiesTab />}
    </aside>
  );
}

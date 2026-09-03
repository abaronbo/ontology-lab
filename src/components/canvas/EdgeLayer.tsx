import type { NodeIndex } from '../../model/derive';
import { edgeGeometry, handleOrigin } from '../../model/geometry';
import { useStore } from '../../model/StoreContext';
import { CANVAS_SIZE, type Connecting, type OntoEdge, type Selection } from '../../model/types';

interface Props {
  edges: OntoEdge[];
  byId: NodeIndex;
  selection: Selection;
  connecting: Connecting | null;
}

const STYLE: Record<OntoEdge['kind'], { color: string; dash: string; marker: string }> = {
  subClassOf: { color: 'var(--gray-500)', dash: '0', marker: 'url(#arrow-solid)' },
  objectProperty: { color: 'var(--purple-600)', dash: '7,5', marker: 'url(#arrow-purple)' },
  datatypeProperty: { color: 'var(--purple-600)', dash: '2,4', marker: 'url(#arrow-purple)' },
};

export function EdgeLayer({ edges, byId, selection, connecting }: Props) {
  const { dispatch } = useStore();
  const from = connecting ? byId[connecting.fromId] : undefined;
  const preview = connecting && from ? handleOrigin(from, connecting.kind) : null;
  return (
    <svg className="canvas__edges" width={CANVAS_SIZE.w} height={CANVAS_SIZE.h}>
      <defs>
        <marker id="arrow-solid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--gray-500)" />
        </marker>
        <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--purple-600)" />
        </marker>
      </defs>
      {edges.map((e) => {
        const s = byId[e.source];
        const t = byId[e.target];
        if (!s || !t) return null;
        const g = edgeGeometry(s, t);
        const st = STYLE[e.kind];
        const selected = selection?.type === 'edge' && selection.id === e.id;
        return (
          <g key={e.id}>
            {selected && <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="var(--purple-200)" strokeWidth={8} />}
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={st.color} strokeWidth={2} strokeDasharray={st.dash} markerEnd={st.marker} />
            <line
              className="edge-hit"
              x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
              stroke="transparent"
              strokeWidth={14}
              onClick={() => dispatch({ type: 'select', selection: { type: 'edge', id: e.id } })}
            />
          </g>
        );
      })}
      {preview && connecting && (
        <line
          x1={preview.x} y1={preview.y} x2={connecting.x} y2={connecting.y}
          stroke={connecting.kind === 'subclass' ? 'var(--gray-500)' : 'var(--purple-600)'}
          strokeWidth={2}
          strokeDasharray="5,4"
        />
      )}
    </svg>
  );
}
